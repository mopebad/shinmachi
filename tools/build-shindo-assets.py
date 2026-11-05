"""Blender 4.5: import CC0 sources, fit, consolidate, author small barware, export GLB.
Run from repository root with blender --background --python tools/build-shindo-assets.py.
"""
import bpy, math, os, json
from mathutils import Vector
ROOT=os.getcwd(); OUT=os.path.join(ROOT,'public/assets/shindo'); SOURCE=os.path.join(ROOT,'assets-source/shindo')
os.makedirs(OUT,exist_ok=True)
audit=[]
def reset():
    bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
    bpy.ops.outliner.orphans_purge(do_recursive=True)
def material(name,color,rough=.4,metal=0,trans=0):
    m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);m.use_nodes=True
    p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*color,1);p.inputs['Roughness'].default_value=rough;p.inputs['Metallic'].default_value=metal;p.inputs['Transmission Weight'].default_value=trans;p.inputs['IOR'].default_value=1.46
    m.use_fake_user=True
    return m
def lathe(name,profile,mat,flute=0):
    n=96;verts=[];faces=[]
    for r,z in profile:
        for i in range(n):
            a=2*math.pi*i/n;rr=r+(flute*(.5+.5*math.cos(a*16)) if .008<z<.075 else 0)
            verts.append((rr*math.cos(a),rr*math.sin(a),z))
    for j in range(len(profile)-1):
        for i in range(n):
            k=j*n+i;l=j*n+(i+1)%n;faces.append((k,l,l+n,k+n))
    mesh=bpy.data.meshes.new(name);mesh.from_pydata(verts,[],faces);mesh.update();o=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(o);o.data.materials.append(mat)
    for p in mesh.polygons:p.use_smooth=True
    return o
def bevel_cube(name,loc,size,mat,r=.004):
    bpy.ops.mesh.primitive_cube_add(size=1,location=loc);o=bpy.context.object;o.name=name;o.dimensions=size;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    o.data.materials.append(mat);mod=o.modifiers.new('Soft manufactured edges','BEVEL');mod.width=r;mod.segments=3
    bpy.ops.object.modifier_apply(modifier=mod.name);mod=o.modifiers.new('Corner normals','WEIGHTED_NORMAL');bpy.ops.object.modifier_apply(modifier=mod.name)
    return o
def export(name,objects=None,combine=True):
    objects=objects or [o for o in bpy.context.scene.objects if o.type=='MESH']
    if combine:
        # Split multi-material meshes, then join all opaque parts by material.
        for o in list(objects):
            bpy.ops.object.select_all(action='DESELECT');o.select_set(True);bpy.context.view_layer.objects.active=o
            if len(o.data.materials)>1:
                bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT');bpy.ops.mesh.separate(type='MATERIAL');bpy.ops.object.mode_set(mode='OBJECT')
        groups={}
        for o in [o for o in bpy.context.scene.objects if o.type=='MESH']:
            groups.setdefault(o.active_material,[]).append(o)
        for mat,parts in groups.items():
            bpy.ops.object.select_all(action='DESELECT')
            for o in parts:o.select_set(True)
            bpy.context.view_layer.objects.active=parts[0];bpy.ops.object.join();parts[0].name=mat.name if mat else name
        objects=[o for o in bpy.context.scene.objects if o.type=='MESH']
    bpy.ops.object.select_all(action='DESELECT')
    for o in objects:o.select_set(True)
    # Labels stay at 1K; micro-normal and scalar maps need only 512px here.
    for img in bpy.data.images:
        if img.size[0]>0:
            limit=1024 if 'label' in img.name and 'diff' in img.name else 512
            if max(img.size)>limit:
                ratio=limit/max(img.size);img.scale(round(img.size[0]*ratio),round(img.size[1]*ratio))
    bpy.ops.export_scene.gltf(filepath=os.path.join(OUT,name+'.glb'),export_format='GLB',use_selection=True,export_yup=True,export_extras=True,export_image_format='AUTO',export_image_quality=82,export_materials='EXPORT')
    for o in objects:o.data.calc_loop_triangles()
    coords=[o.matrix_world@Vector(v) for o in objects for v in o.bound_box]
    audit.append({'asset':name,'bytes':os.path.getsize(os.path.join(OUT,name+'.glb')),'triangles':sum(len(o.data.loop_triangles) for o in objects),'meshes':len(objects),'dimensions':[round(max(v[i] for v in coords)-min(v[i] for v in coords),5) for i in range(3)],'blenderAxes':'X right, Z up, front -Y; GLB +Y up, front +Z'})
def pack(name):
    bpy.ops.file.pack_all()
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(SOURCE,name+'.blend'),compress=True)

for name in ['turntable','amplifier','speaker']:
    reset();bpy.ops.import_scene.gltf(filepath=os.path.join(SOURCE,name+'.glb'))
    # Imported materials have deliberately restrained micro-normal maps.
    for m in bpy.data.materials:
        if m.use_nodes:
            p=m.node_tree.nodes.get('Principled BSDF')
            if p and 'galvanized' in m.name.lower():p.inputs['Roughness'].default_value=.29
    if name=='turntable':
        chrome=material('Machined tonearm aluminium',(.5,.53,.54),.19,.9)
        rubber=material('Tonearm rubber and cartridge',(.014,.019,.02),.43)
        for o in list(bpy.context.scene.objects):
            if o.name in ['S-shaped tonearm','Headshell']:bpy.data.objects.remove(o,do_unlink=True)
        curve=bpy.data.curves.new('Continuous balanced S tonearm','CURVE');curve.dimensions='3D';curve.bevel_depth=.0038;curve.bevel_resolution=3;curve.resolution_u=12
        spline=curve.splines.new('BEZIER');points=[(.145,.121,.151),(.153,.085,.150),(.146,.02,.149),(.137,-.035,.148),(.103,-.060,.146),(.064,-.068,.145)];spline.bezier_points.add(len(points)-1)
        for p,co in zip(spline.bezier_points,points):p.co=co;p.handle_left_type='AUTO';p.handle_right_type='AUTO'
        arm=bpy.data.objects.new('S tonearm / stylus over outer grooves',curve);bpy.context.collection.objects.link(arm);arm.data.materials.append(chrome);bpy.ops.object.select_all(action='DESELECT');arm.select_set(True);bpy.context.view_layer.objects.active=arm;bpy.ops.object.convert(target='MESH')
        # The sourced chassis already provides the S arm and platter. Finish its gimbal,
        # counterweight, cue support and slotted headshell using measured reference proportions.
        for label,r,depth,position in [('Counterweight',.020,.031,(.145,.157,.145)),('Gimbal bearing',.024,.009,(.145,.121,.144))]:
            o=lathe(label,[(0,-depth/2),(r,-depth/2),(r,depth/2),(0,depth/2)],chrome);o.rotation_euler.x=math.pi/2;o.location=position
        bevel_cube('Cartridge body',(.057,-.071,.14),(.019,.028,.012),rubber,.0015)
        bevel_cube('Stylus cantilever',(.054,-.076,.134),(.002,.008,.004),chrome,.0004)
        for dx in [-.006,.006]:bevel_cube('Headshell slot',(.057+dx,-.073,.147),(.002,.017,.001),rubber,.0003)
        bevel_cube('Cue lever',(.177,.1,.14),(.003,.035,.003),chrome,.001)
    if name=='speaker':
        # Subtle paper-like driver colour is readable in the warm room light.
        paper=material('Graphite paper cone',(.035,.039,.036),.82)
        for o in bpy.context.scene.objects:
            if o.type=='MESH' and 'dished cone' in o.name:o.data.materials.clear();o.data.materials.append(paper)
    pack(name+'-editable');export(name)

reset();bpy.ops.import_scene.gltf(filepath=os.path.join(SOURCE,'wine/wine.gltf'))
wine=[o for o in bpy.context.scene.objects if o.type=='MESH'];pack('bottles-editable')
for i,o in enumerate(wine):
    # Each bottle is authored individually in source; reset floor and centre.
    coords=[o.matrix_world@Vector(v) for v in o.bound_box];mid=Vector(((min(v.x for v in coords)+max(v.x for v in coords))/2,(min(v.y for v in coords)+max(v.y for v in coords))/2,min(v.z for v in coords)))
    o.location-=mid;bpy.context.view_layer.update();export('bottle-'+str(i),[o],False)

reset()
glass=material('Optical clear glass / thick closed walls',(.94,.985,.97),.065,0,.96)
whisky=material('Amber whisky / meniscus',(.20,.065,.009),.13)
water=material('Water / faint cool reflection',(.19,.26,.24),.09,0,.65)
ice=material('Ice / cloudy core polished melt',(.63,.76,.73),.11,0,0)
steel=material('Brushed stainless barware',(.48,.52,.53),.22,.94)
for name,h,r,cut in [('rocks',.112,.044,.0011),('water-glass',.155,.038,0),('highball',.225,.036,0)]:
    reset()
    profile=[(0,.001),(r*.78,.001),(r*.94,.002),(r,.006),(r,.015),(r,.065),(r,.076),(r,h-.002),(r-.0006,h),(r-.0025,h),(r-.0032,h-.003),(r-.004,.076),(r-.004,.016),(r-.006,.012),(0,.012)]
    shell=lathe('Hand-finished '+name+' / rim, wall, heavy heel',profile,glass,cut)
    if name=='water-glass':export('empty-glass',[shell],False)
    level={'rocks':.049,'water-glass':.105,'highball':.158}[name]
    lathe('Drink with raised edge meniscus',[(0,.013),(r-.0045,.013),(r-.0045,level+.0007),(r-.006,level),(0,level)],whisky if name!='water-glass' else water)
    if name!='water-glass':
        for i in range(2 if name=='rocks' else 4):
            size=.028 if name=='rocks' else .025
            o=bevel_cube('Rounded melting ice',((-.012 if i%2 else .011),(-.009 if i%2 else .009),.035+i*.012 if name=='rocks' else .036+i*.031),(size,size,size),ice,.0045);o.rotation_euler=(.12+i*.2,.25,.45+i*.8)
    pack(name+'-editable');export(name)

reset()
lathe('Cobbler shaker / rolled base and tapered body',[(0,0),(.027,0),(.034,.003),(.036,.008),(.044,.146),(.043,.153),(.041,.156),(.04,.158),(.031,.188),(.018,.194),(.018,.211),(.016,.217),(0,.217)],steel)
lathe('Cobbler lid / separation seam',[(.04,.156),(.043,.157),(.043,.16),(.04,.161)],steel)
lathe('Jigger / open double measure',[(0,0),(.02,0),(.023,.002),(.023,.003),(.011,.039),(.011,.047),(.028,.088),(.029,.091),(.027,.091),(.009,.048),(.009,.04),(.021,.005),(0,.005)],steel).location.x=.108
pack('bar-tools-editable');export('bar-tools')
with open(os.path.join(OUT,'geometry.json'),'w') as f:json.dump(audit,f,indent=2)
print('SHINDO_ASSETS',json.dumps(audit))
