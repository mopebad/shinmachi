"""Blender 4.5: prepare the measured, licensed stool and frozen Yoto modules.
Run from the repository root: blender --background --python tools/build-workflow-assets.py
"""
import bpy, os, json, sys
from mathutils import Vector, Matrix
root=os.getcwd();source=os.path.join(root,'assets-source/workflow2');runtime=os.path.join(root,'public/assets/workflow2');records=[]
for name,file in [('stool','stool-original.glb'),('yoto-ramen','yoto-ramen.glb'),('yoto-izakaya','yoto-izakaya.glb')]:
    editable=os.path.join(source,name+'-editable.blend')
    if os.path.isfile(editable) and '--from-originals' not in sys.argv:
        bpy.ops.wm.open_mainfile(filepath=editable)
    else:
        bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False);bpy.ops.outliner.orphans_purge(do_recursive=True)
        bpy.ops.import_scene.gltf(filepath=os.path.join(source,file))
        if name=='stool':
            for o in list(bpy.context.scene.objects):
                if 'low embracing back' in o.name:bpy.data.objects.remove(o,do_unlink=True)
            objects=[o for o in bpy.context.scene.objects if o.type=='MESH'];coords=[o.matrix_world@Vector(v) for o in objects for v in o.bound_box]
            lo=Vector(tuple(min(v[i] for v in coords) for i in range(3)));hi=Vector(tuple(max(v[i] for v in coords) for i in range(3)))
            fit=Matrix.Diagonal(Vector((.40/(hi.x-lo.x),.40/(hi.y-lo.y),.74/(hi.z-lo.z),1)))@Matrix.Translation(Vector((-(lo.x+hi.x)/2,-(lo.y+hi.y)/2,-lo.z)))
            for o in objects:o.matrix_world=fit@o.matrix_world
        bpy.ops.file.pack_all();bpy.ops.wm.save_as_mainfile(filepath=editable,compress=True)
    for image in bpy.data.images:
        if image.size[0]:
            limit=1024 if max(image.size)/min(image.size)>1.3 else 512
            if max(image.size)>limit:
                ratio=limit/max(image.size);image.scale(round(image.size[0]*ratio),round(image.size[1]*ratio))
    bpy.ops.export_scene.gltf(filepath=os.path.join(runtime,name+'.glb'),export_format='GLB',export_yup=True,export_image_format='JPEG',export_image_quality=82,export_extras=True)
    coords=[o.matrix_world@Vector(v) for o in bpy.context.scene.objects if o.type=='MESH' for v in o.bound_box]
    records.append({'id':name,'bytes':os.path.getsize(os.path.join(runtime,name+'.glb')),'dimensionsBlenderXYZ':[max(v[i] for v in coords)-min(v[i] for v in coords) for i in range(3)]})
with open(os.path.join(runtime,'metadata.json'),'w') as f:json.dump(records,f,indent=2)
print('WORKFLOW_ASSETS',json.dumps(records))
