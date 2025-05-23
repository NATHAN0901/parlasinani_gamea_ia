## estas son las siguientes apis con el acceso para el chatboy 
#con los siguiente requerimientos 
#
# 
# 
# o las jerarquia de la apis a que se desarrolla
#####
#
# https://ciudadania.elalto.gob.bo/api/categories/all
# https://ciudadania.elalto.gob.bo/api/procedures/2/category
# https://ciudadania.elalto.gob.bo/api/requirements/43/procedure
#
# hola aqui hay un ejemplo de la primera api lo que me devuelve 

"""
[
  {
    "id": 1,
    "nombre_categoria": "ACTIVIDAD ECONÓMICA Y PUBLICIDAD",
    "imagen_categoria": "1722271488_66a7c70071942.png",
    "sadm_categoria": 0,
    "id_dependencia_n1": null,
    "id_dependencia_n2": 2001,
    "id_dependencia_n3": 3001,
    "id_dependencia": null,
    "fecha_creacion": "2024-05-22T10:51:47.000000Z",
    "fecha_modificacion": "2024-07-29T16:44:48.000000Z",
    "deleted_at": null
  },
  {
    "id": 2,
    "nombre_categoria": "VEHÍCULOS",
    "imagen_categoria": "1722268583_66a7bba74bb62.png",
    "sadm_categoria": 0,
    "id_dependencia_n1": null,
    "id_dependencia_n2": 2001,
    "id_dependencia_n3": 3001,
    "id_dependencia": null,
    "fecha_creacion": "2024-05-22T10:51:14.000000Z",
    "fecha_modificacion": "2024-07-29T15:56:23.000000Z",
    "deleted_at": null
  },
#
# esto solo es una pequeña parte de lo que devueve el tramiti
# 
# y para el segundo enlace lo que nos devuelve las petiiciones son las siguientes 
{
#  "success": true,
#  "procedures": [
    {
      "id": 43,
      "nombre_tramite": "CAMBIO DE RADICATORIA",
      "descripcion_tramite": "CAMBIO DE RADICACIÓN DEL VEHÍCULO DE UN DETERMINADO GOBIERNO MUNICIPAL A OTRO, (EN ESTE CASO DE CUALQUIER MUNICIPIO AL MUNICIPIO DE EL ALTO)",
      "imagen_tramite": "https://ciudadania.elalto.gob.bo/storage/images_procedures/1727363317_66f578f5db73d.png"
    },
    {
      "id": 44,
      "nombre_tramite": "DESCUENTO SERVICIO PÚBLICO VEHÍCULOS",
      "descripcion_tramite": "ES UN BENEFICIO DEL 50% DE DESCUENTO DEL IMPUESTO POR EL SERVICIO DE PASAJEROS Y CARGA",
      "imagen_tramite": "https://ciudadania.elalto.gob.bo/storage/images_procedures/1727974774_66fecd769b98b.png"
    },
    {
# 
#
#   y para el ultimo enlace los que nos devuelve son las siguiente datos 
{
  "1": [
    {
      "id": 295,
      "nombre_requisito": "CERTIFICADO DE REGISTRO DE PROPIEDAD - VEHíCULO AUTOMOTOR (CRPVA) O RUA - 03",
      "id_tramite": 43,
      "id_tipo_persona": 1,
      "fecha_creacion": "2024-06-14T15:25:56.000000Z",
      "fecha_modificacion": "2024-06-14T15:25:56.000000Z",
      "deleted_at": null
    },
    {
      "id": 296,
      "nombre_requisito": "FOTOCOPIA NIT (SI FUESE PERSONA JURíDICA)",
      "id_tramite": 43,
      "id_tipo_persona": 1,
      "fecha_creacion": "2024-06-14T15:26:02.000000Z",
      "fecha_modificacion": "2024-06-14T15:26:02.000000Z",
      "deleted_at": null
    },
#
#
#    como se puede de dar cuenta esta una gerarquia de de primero la tabla  tomamos la peticion e la siguiente cosa
https://ciudadania.elalto.gob.bo/api/categories/all
 luego tomamos la id=2 que seria el dde vehiculos lo cual tienes sus datos 
 una vez incorporado en ponemos ese id en la siguiente api con esa id que es 2
  https://ciudadania.elalto.gob.bo/api/procedures/2/category
  
  luego nos indica una pequeña descripcion como esta

 "procedures": [
    {
      "id": 43,
      "nombre_tramite": "CAMBIO DE RADICATORIA",
      "descripcion_tramite": "CAMBIO DE RADICACIÓN DEL VEHÍCULO DE UN DETERMINADO GOBIERNO MUNICIPAL A OTRO, (EN ESTE CASO DE CUALQUIER MUNICIPIO AL MUNICIPIO DE EL ALTO)",
      "imagen_tramite": "https://ciudadania.elalto.gob.bo/storage/images_procedures/1727363317_66f578f5db73d.png"
    },
    
    
y vemos que tenemos una pequeña id que es id=43


luego utilizamos la ultima ip que es la siguiente y introducimos el id que en este caso es id=43

ejemplo : https://ciudadania.elalto.gob.bo/api/requirements/43/procedure
lo que nos da es todos los requisitos que necesitamos para ello lo siguiente : 
    {
  "1": [
    {
      "id": 295,
      "nombre_requisito": "CERTIFICADO DE REGISTRO DE PROPIEDAD - VEHíCULO AUTOMOTOR (CRPVA) O RUA - 03",
      "id_tramite": 43,
      "id_tipo_persona": 1,
      "fecha_creacion": "2024-06-14T15:25:56.000000Z",
      "fecha_modificacion": "2024-06-14T15:25:56.000000Z",
      "deleted_at": null
    },
    {
      "id": 296,
      "nombre_requisito": "FOTOCOPIA NIT (SI FUESE PERSONA JURíDICA)",
      "id_tramite": 43,
      "id_tipo_persona": 1,
      "fecha_creacion": "2024-06-14T15:26:02.000000Z",
      "fecha_modificacion": "2024-06-14T15:26:02.000000Z",
      "deleted_at": null
    },
    {
      "id": 297,
      "nombre_requisito": "C.I. ORIGINAL Y FOTOCOPIA (DE LAS PARTES INVOLUCRADAS",
      "id_tramite": 43,
      "id_tipo_persona": 1,
      "fecha_creacion": "2024-06-14T15:26:19.000000Z",
      "fecha_modificacion": "2024-06-14T15:26:19.000000Z",
      "deleted_at": null
    },
    {
      "id": 298,
      "nombre_requisito": "TERCERAS PERSONAS O PERSONAS JURÍDICAS SOLO CON PODER DE REPRESENTACIóN NOTARIADO EN ORIGINAL O FOTOCOPIA LEGALIZADA MáS UNA FOTOCOPIA SIMPLE (SI HA PASADO MáS DE UN AñO DESDE SU EMISIóN REQUERIRá LA ACTUALIZACIóN DEL NOTARIO)",
      "id_tramite": 43,
      "id_tipo_persona": 1,
      "fecha_creacion": "2024-06-14T15:26:27.000000Z",
      "fecha_modificacion": "2024-06-14T15:26:27.000000Z",
      "deleted_at": null
    },
    {
      "id": 299,
      "nombre_requisito": "TODAS LAS SOLICITUDES ESCRITAS DEBEN CONTAR CON DOS (2) TIMBRES",
      "id_tramite": 43,
      "id_tipo_persona": 1,
      "fecha_creacion": "2024-06-14T15:26:35.000000Z",
      "fecha_modificacion": "2024-06-14T15:26:35.000000Z",
      "deleted_at": null
    }
  ]
}
Beta
0 / 0

"""
