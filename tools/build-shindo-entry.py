"""Blender 4.5: fitted Shindo street/stair/acoustic-threshold assemblies.
Existing editable scenes are authoritative; -- --from-design regenerates these six.
"""
import bpy, math, os, json, sys
from mathutils import Vector
ROOT=os.getcwd()
SOURCE=os.path.join(ROOT,'assets-source/shindo')
OUT=os.path.join(ROOT,'public/assets/shindo')

def reset():
    bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
    bpy.ops.outliner.orphans_purge(do_recursive=True)

def material(name,color,rough=.6,metal=0,emission=0):
    m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);m.use_nodes=True
    p=m.node_tree.nodes.get('Principled BSDF')
    p.inputs['Base Color'].default_value=(*color,1)
    p.inputs['Roughness'].default_value=rough;p.inputs['Metallic'].default_value=metal
    if emission:
        p.inputs['Emission Color'].default_value=(1,.65,.32,1)
        p.inputs['Emission Strength'].default_value=emission
    return m

def palette():
    return {'wood':material('Entry | smoked walnut',(.22,.14,.085),.58),
            'metal':material('Entry | patinated bronze',(.23,.19,.12),.48,.63),
            'dark':material('Entry | blackened steel',(.035,.043,.041),.64,.32),
            'stone':material('Entry | honed basalt',(.075,.084,.081),.88),
            'plaster':material('Entry | charcoal plaster',(.12,.14,.13),.96),
            'lens':material('Entry | warm recessed diffuser',(.75,.65,.46),.7,0,.75)}

def xyz(p):return (p[0],-p[2],p[1])

def box(name,p,size,mat,r=.003):
    bpy.ops.mesh.primitive_cube_add(size=1,location=xyz(p));o=bpy.context.object;o.name=name
    o.dimensions=(size[0],size[2],size[1]);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    o.data.materials.append(mat)
    if r:
        mod=o.modifiers.new('Eased manufactured arris','BEVEL');mod.width=r;mod.segments=3
        bpy.ops.object.modifier_apply(modifier=mod.name)
        mod=o.modifiers.new('Weighted corner normals','WEIGHTED_NORMAL');bpy.ops.object.modifier_apply(modifier=mod.name)
    return o

def tube(name,a,b,r,mat):
    a,b=Vector(xyz(a)),Vector(xyz(b));delta=b-a
    bpy.ops.mesh.primitive_cylinder_add(vertices=24,radius=r,depth=delta.length,location=(a+b)/2)
    o=bpy.context.object;o.name=name;o.rotation_euler=delta.to_track_quat('Z','Y').to_euler();o.data.materials.append(mat)
    for p in o.data.polygons:p.use_smooth=True
    return o

def exterior(m):
    # Clear 1.76 m opening. Posts occupy the existing wall-side rail reservations.
    for x in [-.94,.94]:
        box('Stone plinth / street splash zone',(x,.15,.01),(.125,.3,.28),m['stone'],.006)
        box('Smoked walnut entrance jamb',(x,1.44,.005),(.12,2.58,.25),m['wood'],.008)
        box('Bronze reveal / rebated inner edge',(x+(.055 if x<0 else -.055),1.47,.041),(.009,2.57,.18),m['metal'],.002)
    box('Lintel / continuous walnut surround',(0,2.64,.005),(2,.16,.25),m['wood'],.008)
    box('Inset identity mounting plate',(0,2.42,.143),(1.02,.35,.04),m['dark'],.008)
    for x in [-.488,.488]:
        for y in [2.278,2.562]:box('Bronze plate fixing',(x,y,.167),(.008,.008,.004),m['metal'],.002)
    box('Recessed entry downlight hood',(0,2.195,.027),(.65,.045,.15),m['dark'],.005)
    box('Downward diffuser',(0,2.172,.017),(.51,.006,.073),m['lens'],.002)
    for x in [-.71,-.35,0,.35,.71]:
        box('Tongued soffit board',(x,2.555,-.135),(.342,.035,.45),m['wood'],.003)

def doorway(m):
    # Origin: centre of existing landing opening. Leaf is held 90 degrees open at east jamb.
    for x in [-.86,.86]:
        box('Walnut threshold jamb',(x,1.155,0),(.065,2.31,.13),m['wood'],.006)
        box('Door stop / acoustic seal rebate',(x+(.027 if x<0 else -.027),1.155,.032),(.012,2.3,.038),m['dark'],.002)
    box('Walnut acoustic head',(0,2.36,0),(1.795,.1,.13),m['wood'],.004)
    box('Upper plaster closure',(0,2.4675,0),(1.805,.115,.12),m['plaster'],.002)
    # Two properly mounted faces: arrival toward the stair, exit toward the bar.
    for z in [-.071,.071]:box('Inset wayfinding carrier',(0,2.36,z),(.57,.079,.012),m['dark'],.003)
    # Leaf local X fits x 20.215..20.34; local Z fits the original open-leaf reservation.
    x=.78;z=-.44
    box('Acoustic door / solid walnut leaf',(x,1.155,z),(.092,2.3,.81),m['wood'],.008)
    for zz in [-.69,-.44,-.19]:
        box('Shallow raised walnut face field',(x-.049,1.38,zz),(.012,1.65,.222),m['wood'],.004)
    box('Bronze heel plate',(x-.05,.12,z),(.006,.15,.75),m['metal'],.003)
    for y in [.24,1.15,2.07]:
        tube('Hinge barrel / stair-edge pivot',(x+.019,y-.05,-.047),(x+.019,y+.05,-.047),.011,m['metal'])
        box('Hinge leaf fixing',(x-.049,y,-.077),(.009,.1,.047),m['metal'],.002)
    # Handle is on the free end, opposite the visible stair-side hinge axis.
    for y in [.91,1.12]:tube('Returned pull fixing',(x-.046,y,-.735),(x-.061,y,-.735),.007,m['metal'])
    tube('Patinated bronze door pull',(x-.061,.91,-.735),(x-.061,1.12,-.735),.009,m['metal'])
    box('Wall retainer / held-open position',(x+.05,.19,-.72),(.025,.035,.045),m['dark'],.004)
    box('Low bronze saddle',(0,.002,-.03),(1.6,.004,.08),m['metal'],.001)

def landing(m):
    # Return wall between the bar and stair; continuous with existing 1.01 m dado cap.
    for x in [-.84,0,.84]:
        box('Walnut return wainscot',(x,.51,0),(.828,.91,.035),m['wood'],.005)
        box('Recessed walnut panel field',(x,.53,-.022),(.73,.72,.018),m['wood'],.004)
    box('Recessed base plinth',(0,.055,.004),(2.54,.11,.028),m['dark'],.002)
    box('Bronze cap / continuous datum',(0,1.01,-.004),(2.54,.018,.045),m['metal'],.002)
    box('House notice / mounted bronze edge',(0,1.65,-.009),(.376,.466,.026),m['metal'],.004)
    box('Quiet picture-light hood',(0,1.94,-.056),(.24,.03,.07),m['dark'],.003)
    box('Downcast warm diffuser',(0,1.922,-.06),(.19,.005,.043),m['lens'],.001)

def dado(m):
    # Four fitted panels per side follow the real 18-tread slope; no added walking solids.
    slope=3.06/5.04
    for side in [-1,1]:
        x=side*.883
        for i in range(4):
            a=-i*1.26-.007;b=-(i+1)*1.26+.007
            pts=[]
            for xx in [x-.012,x+.012]:
                pts.extend([xyz((xx,slope*a-.12,a)),xyz((xx,slope*b-.12,b)),xyz((xx,slope*b+.55,b)),xyz((xx,slope*a+.55,a))])
            faces=[(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)]
            mesh=bpy.data.meshes.new('Sloped dado panel');mesh.from_pydata(pts,[],faces);mesh.update()
            o=bpy.data.objects.new('Honed basalt stair dado / jointed',mesh);bpy.context.collection.objects.link(o);o.data.materials.append(m['stone'])
        tube('Slim bronze sloped dado cap',(x,.557,0),(x,-3.06+.557,-5.04),.009,m['metal'])

def lamp(m):
    box('Wall backing plate',(.015,0,0),(.035,.14,.2),m['dark'],.004)
    box('Downlight visor',(.046,.039,0),(.059,.04,.192),m['metal'],.004)
    box('Recessed lens / faces downward',(.046,.015,0),(.043,.006,.143),m['lens'],.002)
    for z in [-.084,.084]:box('Visor end cheek',(.046,.002,z),(.059,.074,.017),m['dark'],.003)
    box('Lower glare shield',(.06,-.04,0),(.024,.018,.19),m['dark'],.003)

def threshold(m):
    box('Basalt street saddle',(0,-.009,-.29),(1.74,.024,.19),m['stone'],.004)
    box('Matte bronze threshold arris',(0,.003,-.38),(1.73,.004,.018),m['metal'],.001)
    box('Recessed drainage tray',(0,-.004,.28),(1.62,.012,.12),m['dark'],.002)
    for i in range(38):box('Slotted street drainage grate',(-.777+i*.042,.002,.28),(.016,.004,.108),m['metal'],.001)

DESIGNS={'entry-portal':exterior,'acoustic-entry':doorway,'landing-return':landing,'stair-dado':dado,'stair-downlight':lamp,'entry-threshold':threshold}
audit=[]
for name,design in DESIGNS.items():
    file=os.path.join(SOURCE,name+'-editable.blend')
    if os.path.isfile(file) and '--from-design' not in sys.argv:bpy.ops.wm.open_mainfile(filepath=file)
    else:
        reset();design(palette());bpy.ops.file.pack_all();bpy.ops.wm.save_as_mainfile(filepath=file,compress=True)
    groups={}
    for o in list(bpy.context.scene.objects):
        if o.type=='MESH':groups.setdefault(o.active_material,[]).append(o)
    for mat,objects in groups.items():
        bpy.ops.object.select_all(action='DESELECT')
        for o in objects:o.select_set(True)
        bpy.context.view_layer.objects.active=objects[0]
        if len(objects)>1:bpy.ops.object.join()
        objects[0].name=mat.name
    bpy.ops.export_scene.gltf(filepath=os.path.join(OUT,name+'.glb'),export_format='GLB',export_yup=True)
    coords=[o.matrix_world@Vector(v) for o in bpy.context.scene.objects if o.type=='MESH' for v in o.bound_box]
    d=[max(p[i] for p in coords)-min(p[i] for p in coords) for i in range(3)]
    audit.append({'asset':name,'dimensions':[round(d[0],5),round(d[2],5),round(d[1],5)],'bytes':os.path.getsize(os.path.join(OUT,name+'.glb'))})
with open(os.path.join(OUT,'entry-geometry.json'),'w') as f:json.dump(audit,f,indent=2)
print('SHINDO_ENTRY',json.dumps(audit))
