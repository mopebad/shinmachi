"""Blender 4.5: original fitted Shindo joinery and service props, metres / Y-up GLBs.

Run from project root with blender --background --python tools/build-shindo-atmosphere.py.
Existing packed .blend files are authoritative; pass -- --from-design to regenerate.
"""
import bpy, math, os, json, sys
from mathutils import Vector

ROOT = os.getcwd()
SOURCE = os.path.join(ROOT, 'assets-source/shindo')
OUT = os.path.join(ROOT, 'public/assets/shindo')
audit = []

def reset():
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
    bpy.ops.outliner.orphans_purge(do_recursive=True)

def mat(name, color, rough=.5, metal=0):
    m = bpy.data.materials.new(name)
    m.diffuse_color = (*color, 1)
    m.use_nodes = True
    p = m.node_tree.nodes.get('Principled BSDF')
    p.inputs['Base Color'].default_value = (*color, 1)
    p.inputs['Roughness'].default_value = rough
    p.inputs['Metallic'].default_value = metal
    return m

def palette():
    return {
        'wood': mat('Joinery | oiled walnut', (.25,.16,.095), .48),
        'leather': mat('Upholstery | oxblood hide', (.15,.066,.056), .68),
        'seam': mat('Upholstery | waxed piping', (.095,.047,.033), .76),
        'steel': mat('Service | brushed stainless', (.39,.43,.44), .31, .82),
        'dark': mat('Hardware | blackened steel', (.035,.043,.042), .56, .5),
        'brass': mat('Hardware | aged brass', (.36,.25,.11), .44, .72),
        'linen': mat('Linen | unbleached cotton', (.61,.55,.43), .98),
        'ceramic': mat('Stoneware | warm ash glaze', (.43,.46,.4), .27),
        'felt': mat('Acoustics | woven charcoal', (.042,.053,.05), .97),
    }

# Model coordinates use game X,Y,Z; convert to Blender X,-Z,Y before export.
def point(p): return (p[0], -p[2], p[1])

def box(name, p, size, material, bevel=.004):
    bpy.ops.mesh.primitive_cube_add(size=1, location=point(p))
    o = bpy.context.object
    o.name = name
    o.dimensions = (size[0], size[2], size[1])
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    o.data.materials.append(material)
    if bevel:
        mod=o.modifiers.new('Hand eased edges', 'BEVEL')
        mod.width=bevel
        mod.segments=4
        bpy.ops.object.modifier_apply(modifier=mod.name)
        mod=o.modifiers.new('Face weighted normals','WEIGHTED_NORMAL')
        bpy.ops.object.modifier_apply(modifier=mod.name)
    return o

def path(name, pts, radius, material, cyclic=False):
    c=bpy.data.curves.new(name,'CURVE')
    c.dimensions='3D'
    c.bevel_depth=radius
    c.bevel_resolution=3
    s=c.splines.new('POLY')
    s.points.add(len(pts)-1)
    for v,p in zip(s.points,pts): v.co=(*point(p),1)
    s.use_cyclic_u=cyclic
    o=bpy.data.objects.new(name,c)
    bpy.context.collection.objects.link(o)
    o.data.materials.append(material)
    bpy.context.view_layer.objects.active=o
    o.select_set(True)
    bpy.ops.object.convert(target='MESH')
    o.select_set(False)
    return o

def lathe(name, profile, material, x=0,z=0):
    verts=[]; faces=[]; n=48
    for r,y in profile:
        for i in range(n):
            a=i*math.tau/n
            verts.append(point((x+r*math.cos(a),y,z+r*math.sin(a))))
    for j in range(len(profile)-1):
        for i in range(n):
            a=j*n+i; b=j*n+(i+1)%n
            faces.append((a,a+n,b+n,b))
    mesh=bpy.data.meshes.new(name)
    mesh.from_pydata(verts,[],faces);mesh.update()
    o=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(o)
    o.data.materials.append(material)
    for f in mesh.polygons: f.use_smooth=True
    return o

def rounded_loop(cx,cy,cz,w,d,r=.025):
    pts=[]
    for x,z,a in [(cx+w/2-r,cz+d/2-r,0),(cx-w/2+r,cz+d/2-r,90),(cx-w/2+r,cz-d/2+r,180),(cx+w/2-r,cz-d/2+r,270)]:
        for i in range(9):
            t=math.radians(a+i*90/8)
            pts.append((x+r*math.cos(t),cy,z+r*math.sin(t)))
    return pts

def counter(m):
    box('Continuous solid walnut counter / eased nose', (0,0,0),(.84,.09,4.06),m['wood'],.014)
    # A thin apron lip creates a readable shadow below the solid top.
    box('Under-edge shadow rebate',(.396,-.049,0),(.025,.014,4.01),m['dark'],.003)
    box('Aged brass nosing',(.418,-.029,0),(.008,.018,4.01),m['brass'],.002)

def worktop(m):
    # Lower shelf has an actual aperture around the inset sink.
    for a,b in [(-1.99,-1.66),(-1.16,1.99)]:
        box('Walnut work surface / sink opening',(0,0,(a+b)/2),(.4,.065,b-a),m['wood'],.004)
    for x in [-.184,.184]:
        box('Sink perimeter rail',(x,0,-1.41),(.032,.065,.5),m['wood'],.003)

def cushion(m):
    box('Seat / softly crowned boxed cushion',(0,.483,0),(.49,.143,.546),m['leather'],.037)
    back=box('Back / rounded upholstered pad',(-.181,.811,0),(.126,.565,.542),m['leather'],.037)
    back.rotation_euler[1]=-.055
    path('Seat welt / stitched perimeter',rounded_loop(0,.482,0,.487,.543,.034),.0025,m['seam'],True)
    pts=[(-.111,.58,-.235),(-.111,1.025,-.235),(-.111,1.053,-.211),(-.111,1.053,.211),(-.111,1.025,.235),(-.111,.58,.235)]
    path('Back pad hand sewn welt',pts,.0023,m['seam'])
    for z in [-.17,.17]:
        box('Back seam stitch',(-.113,.82,z),(.002,.36,.0015),m['seam'],.0005)

def cabinet(m):
    # Face only: fitted over the existing authoritative 360 mm carcass.
    for z in [-1.42,-.65,.12,.89,1.62]:
        width=.7 if z<1.5 else .68
        material=m['steel'] if z==1.62 else m['wood']
        box('Inset service door',(.178,.477,z),(.032,.677,width),material,.006)
        path('Door pull with returned mounts',[(.195,.69,z-.19),(.227,.69,z-.19),(.227,.69,z-.035),(.195,.69,z-.035)],.006,m['steel'])
    box('Recessed toe plinth',(.153,.081,0),(.022,.13,3.96),m['dark'],.003)
    for i in range(17):
        box('Refrigerator ventilation slot',(.2,.228,1.35+i*.032),(.004,.042,.014),m['dark'],.001)
    for z in [-1.86,-1.04,-.27,.5,1.22,1.97]:
        box('Vertical stile',(.168,.49,z),(.045,.77,.028),m['wood'],.003)

def sink(m):
    # Recessed basin built from walls, not a black plate standing in for a sink.
    box('Basin floor',(0,.868,0),(.246,.012,.42),m['steel'],.014)
    for x in [-.129,.129]:box('Basin side',(x,.923,0),(.012,.12,.444),m['steel'],.008)
    for z in [-.216,.216]:box('Basin end',(0,.923,z),(.266,.12,.012),m['steel'],.008)
    for x in [-.149,.149]:box('Worktop lip',(x,.987,0),(.028,.012,.5),m['steel'],.004)
    for z in [-.237,.237]:box('Worktop lip',(0,.987,z),(.28,.012,.026),m['steel'],.004)
    lathe('Drain strainer',[(0,.877),(.025,.877),(.025,.879),(0,.879)],m['dark'])
    pts=[(-.06,.99,-.285),(-.06,1.18,-.285)]
    for i in range(13):
        a=math.pi-i*math.pi/12
        pts.append((-.06,1.18+.07*math.sin(a),-.215+.07*math.cos(a)))
    pts.append((-.06,1.14,-.145))
    path('Gooseneck mixer / continuous tube',pts,.012,m['steel'])
    path('Mixer lever',[(-.06,1.02,-.285),(.015,1.04,-.285)],.005,m['steel'])

def cloth(m):
    # Folded oshibori with a soft edge, visible doubled hem and gentle cloth relief.
    for j in range(3):
        o=box('Folded cotton layer '+str(j),(0,.004+j*.005,0),(.2,.008,.15),m['linen'],.0035)
    for i in range(9):
        pts=[(-.085+k*.008,.019+math.sin(k*.9+i*.45)*.0007,-.058+i*.014) for k in range(22)]
        path('Subtle cotton fold ridge',pts,.0007,m['linen'])
    path('Double stitched hem',[(-.092,.02,-.064),(.092,.02,-.064),(.092,.02,.064)],.0006,m['linen'])

def tray(m):
    box('Rubber service mat',(0,.008,0),(.31,.016,.23),m['dark'],.01)
    for i in range(15):box('Drain rib',(-.133+i*.019,.018,0),(.004,.007,.2),m['dark'],.002)

def snack(m):
    lathe('Saucer / handmade ash glaze',[(0,0),(.055,0),(.071,.005),(.075,.012),(.073,.014),(.057,.006),(0,.006)],m['ceramic'])
    lathe('Small snack bowl',[(0,.008),(.024,.008),(.033,.014),(.044,.04),(.043,.043),(.04,.042),(.03,.018),(0,.017)],m['ceramic'])
    snack=mat('Toasted rice crackers',(.46,.27,.095),.88)
    for i in range(7):
        o=box('Small serving / rice crackers',(math.sin(i*2.4)*.02,.022+(i%3)*.004,math.cos(i*2.4)*.019),(.014,.006,.009),snack,.002)
        o.rotation_euler[2]=i*.7

def carafe(m):
    lathe('Glazed ceramic water carafe',[(0,0),(.042,0),(.05,.008),(.054,.11),(.037,.166),(.028,.176),(.028,.203),(.031,.207),(.027,.21),(.023,.203),(.023,.178),(.032,.17),(.048,.106),(.044,.015),(0,.015)],m['ceramic'])

def records(m):
    colors=[(.3,.17,.13),(.49,.44,.3),(.14,.22,.22),(.28,.28,.29)]
    for i,c in enumerate(colors):
        paper=mat('Record sleeve / archive '+str(i),c,.93)
        o=box('Recently selected 12 inch sleeve '+str(i),(.012*i,.0038+i*.007,0),(.315,.006,.315),paper,.001)
        o.rotation_euler[2]=.04*i
        box('Paper spine',(i*.012,.004+i*.007,.155),(.307,.002,.003),m['linen'],.0004)
    box('Record brush / velvet pad',(.02,.047,-.07),(.105,.021,.032),m['wood'],.004)
    box('Record brush / bristles',(.02,.033,-.07),(.093,.011,.023),m['felt'],.003)

def acoustic(m):
    box('Acoustic cassette / timber frame',(0,0,0),(.082,1.05,1.24),m['wood'],.006)
    box('Absorber / woven charcoal',(-.046,0,0),(.015,.958,1.135),m['felt'],.003)
    # Paired oak retaining battens over fabric, with real rails and mounting caps.
    for z in [-.487,-.445,-.246,-.204,.0,.042,.246,.288,.487,.529]:
        box('Rounded timber batten',(-.065,0,z),(.034,.954,.019),m['wood'],.003)
    for y in [-.459,.459]:
        box('Recessed mounting rail',(-.061,y,0),(.018,.02,1.1),m['dark'],.002)
        for z in [-.536,.536]:
            box('Bronze mounting cap',(-.073,y,z),(.007,.012,.012),m['brass'],.004)

def ceiling(m):
    # Two discreet clamp collars and return flanges on the existing east duct.
    for z in [-.6,.6]:
        for x in [-.155,.155]:box('Duct seam flange',(x,0,z),(.019,.292,.018),m['dark'],.002)
        for y in [-.146,.146]:box('Duct seam flange',(0,y,z),(.31,.017,.018),m['dark'],.002)
    box('Duct inspection cover',(-.148,-.01,0),(.013,.16,.28),m['steel'],.004)
    for z in [-.115,.115]:
        for y in [-.066,.046]:box('Inspection screw',(-.157,y,z),(.004,.007,.007),m['brass'],.002)

DESIGNS={'countertop':counter,'service-worktop':worktop,'banquette-cushion':cushion,'service-joinery':cabinet,'service-sink':sink,'folded-oshibori':cloth,'service-tray':tray,'otsumami-bowl':snack,'water-carafe':carafe,'record-selection':records,'acoustic-cassette':acoustic,'duct-joint':ceiling}
for name,design in DESIGNS.items():
    editable=os.path.join(SOURCE,name+'-editable.blend')
    if os.path.isfile(editable) and '--from-design' not in sys.argv:
        bpy.ops.wm.open_mainfile(filepath=editable)
    else:
        reset();design(palette())
        bpy.ops.file.pack_all()
        bpy.ops.wm.save_as_mainfile(filepath=editable,compress=True)
    # Apply all model transforms and consolidate each named material before export.
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    groups={}
    for o in list(bpy.context.scene.objects):
        if o.type=='MESH':groups.setdefault(o.active_material,[]).append(o)
    for material,objects in groups.items():
        bpy.ops.object.select_all(action='DESELECT')
        for o in objects:o.select_set(True)
        bpy.context.view_layer.objects.active=objects[0]
        if len(objects)>1:bpy.ops.object.join()
        objects[0].name=material.name
    bpy.ops.export_scene.gltf(filepath=os.path.join(OUT,name+'.glb'),export_format='GLB',export_yup=True,export_materials='EXPORT')
    coords=[o.matrix_world@Vector(v) for o in bpy.context.scene.objects if o.type=='MESH' for v in o.bound_box]
    d=[max(p[i] for p in coords)-min(p[i] for p in coords) for i in range(3)]
    audit.append({'asset':name,'dimensions':[round(d[0],5),round(d[2],5),round(d[1],5)],'bytes':os.path.getsize(os.path.join(OUT,name+'.glb'))})
with open(os.path.join(OUT,'atmosphere-geometry.json'),'w') as f:json.dump(audit,f,indent=2)
print('SHINDO_ATMOSPHERE',json.dumps(audit))
