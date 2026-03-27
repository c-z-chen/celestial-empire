import geopandas as gpd
from shapely.ops import voronoi_diagram
from shapely import unary_union
from shapely.geometry import MultiPoint
import json
import os

# 路径保持和你的一致
PREF_FILE = './maps/qing_1820/qing_1820_pref_pgn_wgs84.json'
CNTY_FILE = './maps/qing_1820/qing_1820_cnty_pts_wgs84.json'
OUTPUT_FILE = './maps/qing_1820_counties.json'

print("🚀 启动【自动修复】GIS 纠偏模式...")

# 1. 加载数据
pref = gpd.read_file(PREF_FILE)
cnty = gpd.read_file(CNTY_FILE)

# 强制转换并修复无效几何（buffer(0) 可以修复 90% 的自相交问题）
pref = pref.to_crs("EPSG:4326")
pref['geometry'] = pref['geometry'].buffer(0) 
cnty = cnty.to_crs("EPSG:4326")

# 转换到平面坐标进行泰森切割
working_crs = "EPSG:3857"
pref_prj = pref.to_crs(working_crs)
pref_prj['geometry'] = pref_prj['geometry'].buffer(0)
cnty_prj = cnty.to_crs(working_crs)

results = []

# 2. 遍历每一个府
for idx, p_row in pref_prj.iterrows():
    p_name = p_row.get('NAME_CH')
    p_geom = p_row.geometry
    
    # 严格过滤：跳过名称为空或几何体无效的府
    if not p_name or p_geom is None or p_geom.is_empty:
        continue
    
    # 获取属于该府的县点
    pts = cnty_prj[cnty_prj['LEV2_CH'] == p_name]
    
    if pts.empty:
        continue

    if len(pts) == 1:
        # 独苗县
        feat = pts.iloc[0].copy()
        feat.geometry = p_geom
        results.append(feat)
    else:
        # 多县府：泰森多边形切割
        try:
            # 这里的 buffer(20000) 确保包围盒足够大
            envelope = p_geom.buffer(20000).envelope 
            coords = [pt.coords[0] for pt in pts.geometry]
            
            # 生成泰森图
            v_regions = voronoi_diagram(MultiPoint(coords), envelope=envelope)
            
            for region in v_regions.geoms:
                # 修复可能产生的无效区块
                region = region.buffer(0)
                for _, pt_row in pts.iterrows():
                    if region.contains(pt_row.geometry) or region.distance(pt_row.geometry) < 1:
                        # 核心修复：使用 buffer(0) 后再做交集
                        inter = region.intersection(p_geom)
                        if not inter.is_empty:
                            new_feat = pt_row.copy()
                            new_feat.geometry = inter
                            results.append(new_feat)
                        break
        except Exception as e:
            # 如果还是出错，说明该府边界彻底坏了，尝试直接跳过或简化
            print(f"⚠️ 府 {p_name} 几何过于复杂，已跳过。错误: {e}")

# 3. 最终转换回经纬度并保存
if results:
    final_gdf = gpd.GeoDataFrame(results, crs=working_crs).to_crs("EPSG:4326")
    # 移除一些会导致 JSON 过大的冗余属性（可选）
    final_gdf.to_file(OUTPUT_FILE, driver='GeoJSON')
    print(f"✨ 处理完成！生成县级区块: {len(final_gdf)} 个")
else:
    print("😱 错误：没有生成任何结果！")