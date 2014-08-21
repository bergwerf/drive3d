var OBJ_TITLE, MTL_TITLE, OBJMTL_FOLDER;//for generating EmbedCode

function computeBox(mesh)
{
    mesh.geometry.computeBoundingBox();
    boundingBox = mesh.geometry.boundingBox;
    return mesh.geometry.box = boundingBox;
};

function getBox(object, box)
{
    if(object.children.length > 0)
        for(var i = 0; i < object.children.length; i++)
            bbox = getBox(object.children[i], box);
    else if(object.geometry)
    {
        computeBox(object);
        box.min.x = box.min.x || object.geometry.box.min.x;
        box.max.x = box.max.x || object.geometry.box.max.x;
        box.min.y = box.min.y || object.geometry.box.min.y;
        box.max.y = box.max.y || object.geometry.box.max.y;
        box.min.z = box.min.z || object.geometry.box.min.z;
        box.max.z = box.max.z || object.geometry.box.max.z;
        if(object.geometry.box.min.x < box.min.x) box.min.x = object.geometry.box.min.x;
        if(object.geometry.box.max.x > box.max.x) box.max.x = object.geometry.box.max.x;
        if(object.geometry.box.min.y < box.min.y) box.min.y = object.geometry.box.min.y;
        if(object.geometry.box.max.y > box.max.y) box.max.y = object.geometry.box.max.y;
        if(object.geometry.box.min.z < box.min.z) box.min.z = object.geometry.box.min.z;
        if(object.geometry.box.max.z > box.max.z) box.max.z = object.geometry.box.max.z;
    }
    return box;
};

function loadWavefront(OBJFile, MTLFile, callback)
{
    var objLoader = new THREE.OBJMTLLoader();
    var mtlLoader = new THREE.MTLLoader();
    var object3d, materialsCreator;
    var mtl_ready = true;
    
    //apply materials
    function applyMaterials()
    {
        if(object3d && mtl_ready)
        {
            if(materialsCreator)
            {
                object3d.traverse(function(node)
                {
                    if(node instanceof THREE.Mesh)
                    {
                        if(node.material.name)
                        {
                            var material = materialsCreator.create(node.material.name);
        				    if(material) node.material = material;
    					}
    				}
    			});
            }
            callback(object3d);
        }
    }
    
    //parse OBJ file
    object3d = objLoader.parse(OBJFile, function(mtlfile)//MTLlib callback
    {
        if(!MTLFile)
        {
            //load MTL file
            mtl_ready = false;
            findDriveFile(mtlfile, function(file)
            {
                MTL_TITLE = file.title;
                readDriveFile(file, function(mtllib)
                {
                    materialsCreator = mtlLoader.parse(mtllib);
                    mtl_ready = true;
                    applyMaterials();
                });
            }, function()
            {
                mtl_ready = true;
                applyMaterials();
            });
        }
    });
    
    //parse MTL file if provided directly
    if(MTLFile) materialsCreator = mtlLoader.parse(MTLFile);
    
    applyMaterials();    
};

function loadModel(OBJFile, MTLFile, callback)
{
    loadWavefront(OBJFile, MTLFile, function(group)
    {
        var box = getBox(group, { min: {}, max: {} });
        box.xl = box.max.x - box.min.x;
        box.yl = box.max.y - box.min.y;
        box.zl = box.max.z - box.min.z;
        box.cx = box.min.x + box.xl / 2;
        box.cy = box.min.y + box.yl / 2;
        box.cz = box.min.z + box.zl / 2;
        box.size = box.xl;
        if(box.yl > box.size) box.size = box.yl;
        if(box.zl > box.size) box.size = box.zl;
        callback({ group: group, box: box });
    });
};