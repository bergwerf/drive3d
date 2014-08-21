/**
 * Loads a Wavefront .mtl file specifying materials
 * Optimized for Drive3D
 *
 * @author angelxuanchang
 * @author hermanbergwerf
 */

THREE.MTLLoader = function(){};

THREE.MTLLoader.prototype = {
    
	parse: function(text)
	{
		var lines = text.split("\n");
		var info = {};
		var delimiter_pattern = /\s+/;
		var materialsInfo = {};
        
		for(var i = 0; i < lines.length; i++)
		{
			var line = lines[i];
			line = line.trim();
			if(line.length === 0 || line.charAt(0) === '#')
			{
				// Blank line or comment ignore
				continue;
			}
			var pos = line.indexOf(' ');
			var key = (pos >= 0) ? line.substring(0, pos) : line;
			key = key.toLowerCase();
			var value = (pos >= 0) ? line.substring(pos + 1) : "";
			value = value.trim();
			if(key === "newmtl")
			{
				// New material
				info = {
					name: value
				};
				materialsInfo[value] = info;
			}
			else if(info)
			{
				if(key === "ka" || key === "kd" || key === "ks")
				{
					var ss = value.split(delimiter_pattern, 3);
					info[key] = [parseFloat(ss[0]), parseFloat(ss[1]), parseFloat(ss[2])];
				}
				else
				{
					info[key] = value;
				}
			}
		}
		var materialCreator = new THREE.MTLLoader.MaterialCreator(this.options);
		materialCreator.setMaterials(materialsInfo);
		return materialCreator;
	}
};

/**
 * Create a new THREE-MTLLoader.MaterialCreator
 * @param options - Set of options on how to construct the materials
 *                  side: Which side to apply the material
 *                        THREE.FrontSide (default), THREE.BackSide, THREE.DoubleSide
 *                  wrap: What type of wrapping to apply for textures
 *                        THREE.RepeatWrapping (default), THREE.ClampToEdgeWrapping, THREE.MirroredRepeatWrapping
 *                  normalizeRGB: RGBs need to be normalized to 0-1 from 0-255
 *                                Default: false, assumed to be already normalized
 *                  ignoreZeroRGBs: Ignore values of RGBs (Ka,Kd,Ks) that are all 0's
 *                                  Default: false
 *                  invertTransparency: If transparency need to be inverted (inversion is needed if d = 0 is fully opaque)
 *                                      Default: false (d = 1 is fully opaque)
 * @constructor
 */
 
THREE.MTLLoader.MaterialCreator = function(options)
{
	this.options = options;
	this.materialsInfo = {};
	this.materials = {};
	this.materialsArray = [];
	this.nameLookup = {};
	this.side = (this.options && this.options.side) ? this.options.side : THREE.FrontSide;
	this.wrap = (this.options && this.options.wrap) ? this.options.wrap : THREE.RepeatWrapping;
};

THREE.MTLLoader.MaterialCreator.prototype = {
    
	setMaterials: function(materialsInfo)
	{
		this.materialsInfo = this.convert(materialsInfo);
		this.materials = {};
		this.materialsArray = [];
		this.nameLookup = {};
	},
    
	convert: function(materialsInfo)
	{
		if(!this.options) return materialsInfo;
		var converted = {};
		for(var mn in materialsInfo)
		{
			// Convert materials info into normalized form based on options
			var mat = materialsInfo[mn];
			var covmat = {};
			converted[mn] = covmat;
			for(var prop in mat)
			{
				var save = true;
				var value = mat[prop];
				var lprop = prop.toLowerCase();
				switch (lprop)
				{
				case 'kd':
				case 'ka':
				case 'ks':
					// Diffuse color (color under white light) using RGB values
					if(this.options && this.options.normalizeRGB)
					{
						value = [value[0] / 255, value[1] / 255, value[2] / 255];
					}
					if(this.options && this.options.ignoreZeroRGBs)
					{
						if(value[0] === 0.0 && value[1] === 0.0 && value[1] === 0.0)
						{
							// ignore
							save = false;
						}
					}
					break;
				case 'd':
					// According to MTL format (http://paulbourke.net/dataformats/mtl/):
					//   d is dissolve for current material
					//   factor of 1.0 is fully opaque, a factor of 0 is fully dissolved (completely transparent)
					if(this.options && this.options.invertTransparency)
					{
						value = 1 - value;
					}
					break;
				default:
					break;
				}
				if(save)
				{
					covmat[lprop] = value;
				}
			}
		}
		return converted;
	},
    
	preload: function()
	{
		for(var mn in this.materialsInfo)
		{
			this.create(mn);
		}
	},
    
	getIndex: function(materialName)
	{
		return this.nameLookup[materialName];
	},
    
	getAsArray: function()
	{
		var index = 0;
		for(var mn in this.materialsInfo)
		{
			this.materialsArray[index] = this.create(mn);
			this.nameLookup[mn] = index;
			index++;
		}
		return this.materialsArray;
	},
    
	create: function(materialName)
	{
		if(this.materials[materialName] === undefined)
		{
			this.createMaterial_(materialName);
		}
		return this.materials[materialName];
	},
    
	createMaterial_: function(materialName)
	{
		// Create material
		var mat = this.materialsInfo[materialName];
		var params = {
			name: materialName,
			side: this.side
		};
		for(var prop in mat)
		{
			var value = mat[prop];
			switch (prop.toLowerCase())
			{
				// Ns is material specular exponent
			case 'kd':
				// Diffuse color (color under white light) using RGB values
				params['diffuse'] = new THREE.Color().setRGB(value[0], value[1], value[2]);
				break;
			case 'ka':
				// Ambient color (color under shadow) using RGB values
				params['ambient'] = new THREE.Color().setRGB(value[0], value[1], value[2]);
				break;
			case 'ks':
				// Specular color (color when light is reflected from shiny surface) using RGB values
				params['specular'] = new THREE.Color().setRGB(value[0], value[1], value[2]);
				break;
			case 'map_kd':
				// Diffuse texture map
				var texture = THREE.MTLLoader.loadTexture(value);
				if(texture)
                {
                    params['map'] = texture;
                    params['map'].wrapS = this.wrap;
				    params['map'].wrapT = this.wrap;
                }
				break;
			case 'ns':
				// The specular exponent (defines the focus of the specular highlight)
				// A high exponent results in a tight, concentrated highlight. Ns values normally range from 0 to 1000.
				params['shininess'] = value;
				break;
			case 'd':
				// According to MTL format (http://paulbourke.net/dataformats/mtl/):
				//   d is dissolve for current material
				//   factor of 1.0 is fully opaque, a factor of 0 is fully dissolved (completely transparent)
				if(value < 1)
				{
					params['transparent'] = true;
					params['opacity'] = value;
				}
				break;
			default: break;
			}
		}
		if(params['diffuse'])
		{
			if(!params['ambient']) params['ambient'] = params['diffuse'];
			params['color'] = params['diffuse'];
		}
		this.materials[materialName] = new THREE.MeshPhongMaterial(params);
		return this.materials[materialName];
	}
};

THREE.MTLLoader.loadTexture = function(file, onLoad, onError)
{
	var isDDS = file.toUpperCase().endsWith(".DDS");
	console.log('Textures are not supported yet.');
    return undefined;
};

THREE.MTLLoader.ensurePowerOfTwo_ = function(image)
{
	if(!THREE.MTLLoader.isPowerOfTwo_(image.width) || !THREE.MTLLoader.isPowerOfTwo_(image.height))
	{
		var canvas = document.createElement("canvas");
		canvas.width = THREE.MTLLoader.nextHighestPowerOfTwo_(image.width);
		canvas.height = THREE.MTLLoader.nextHighestPowerOfTwo_(image.height);
		var ctx = canvas.getContext("2d");
		ctx.drawImage(image, 0, 0, image.width, image.height, 0, 0, canvas.width, canvas.height);
		return canvas;
	}
	return image;
};

THREE.MTLLoader.isPowerOfTwo_ = function(x)
{
	return (x & (x - 1)) === 0;
};

THREE.MTLLoader.nextHighestPowerOfTwo_ = function(x)
{
	--x;
	for(var i = 1; i < 32; i <<= 1)
	{
		x = x | x >> i;
	}
	return x + 1;
};