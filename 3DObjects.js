
var canvas;
var context;
var screenWidth;
var screenHeight;
var oldMousePos = {x: 0, y: 0};

var objects;

var renderComplete = true;

var camera = new Camera3D();
var light = new Light3D();

//add html loaded listener
if (document.addEventListener) {
	document.addEventListener("DOMContentLoaded", init, false);
}

function init()
{

	//remove html loaded listener
	document.removeEventListener("DOMContentLoaded", init);

	//Get a handle to the 2d context of the canvas
	canvas = document.getElementById('canvas');
    context = canvas.getContext('2d')
	
	objects = [];
	
	//add object
	var obj1 = new Object3D();
	obj1.initMesh(torus);
	obj1.scaleMesh(0.2,0.2,0.2);
	
	objects.push(obj1);
	
	//add listeners
	canvas.addEventListener("mousemove",handleMouseMove);
	
	window.onresize = function()
	{
		canvas.width = parseInt(window.innerWidth)*0.5;
		canvas.height = parseInt(window.innerHeight)*0.7;
		screenWidth = canvas.width;
		screenHeight = canvas.height;
	}
	
	//Calulate screen height and width
	canvas.width = parseInt(window.innerWidth)*0.5;
	canvas.height = parseInt(window.innerHeight)*0.7;
	
    screenWidth = canvas.width;
    screenHeight = canvas.height;
	
	//start main loop
    setInterval(update, 20);
}


function applyProjection(point,cam)
{
	var scale=cam.focalLength/(point.z+cam.focalLength);
	var point2D={x: (screenWidth/2)+(point.x*scale), y: (screenHeight/2)+(point.y*scale)};
	return point2D
}



function update()
{

	if(!renderComplete)
	{
		return;
	}
	renderComplete = false;
	
	//clear the screen
	context.fillStyle = "rgb(250,240,240)";
	context.fillRect(0, 0, screenWidth, screenHeight);
	
	var imageData = context.createImageData(screenWidth, screenHeight);
	
	//DRAW OBJECTS
	for(var i = 0; i < objects.length; i++)
	{
		var object = objects[i];
		
		//update
		object.update();
		
		object.translateMesh(object.meshPosition.x,object.meshPosition.y,object.meshPosition.z,false);
		
		//sort polygons by z depth
		object.mesh.sort(
			function(polyA,polyB){
			
				var vA1 = object.vertices[polyA.a];
				var vA2 = object.vertices[polyA.b];
				var vA3 = object.vertices[polyA.c];
				
				var vB1 = object.vertices[polyB.a];
				var vB2 = object.vertices[polyB.b];
				var vB3 = object.vertices[polyB.c];
				
				var maxX = Math.max(vA1.x, Math.max(vA2.x,vA3.x));
				var minX = Math.min(vA1.x, Math.min(vA2.x,vA3.x));
				var maxY = Math.max(vA1.y, Math.max(vA2.y,vA3.y));
				var minY = Math.min(vA1.y, Math.min(vA2.y,vA3.y));
				var maxZ = Math.max(vA1.z, Math.max(vA2.z,vA3.z));
				var minZ = Math.min(vA1.z, Math.min(vA2.z,vA3.z));
				
				var centroidA = { x: (minX+maxX)/2, y: (minY+maxY)/2, z: (minZ+maxZ)/2 };
				
				var maxX = Math.max(vB1.x, Math.max(vB2.x,vB3.x));
				var minX = Math.min(vB1.x, Math.min(vB2.x,vB3.x));
				var maxY = Math.max(vB1.y, Math.max(vB2.y,vB3.y));
				var minY = Math.min(vB1.y, Math.min(vB2.y,vB3.y));
				var maxZ = Math.max(vB1.z, Math.max(vB2.z,vB3.z));
				var minZ = Math.min(vB1.z, Math.min(vB2.z,vB3.z));
				
				var centroidB = { x: (minX+maxX)/2, y: (minY+maxY)/2, z: (minZ+maxZ)/2 };

				//return centroidB.z - centroidA.z;
				return object.euclidianDistance(centroidB,camera.position) - object.euclidianDistance(centroidA,camera.position);
			}
		);

		//draw polygons
		for(var i = 0; i < object.mesh.length; i++)
		{
			var polygon = object.mesh[i];
		
			var v1 = object.vertices[polygon.a];
			var v2 = object.vertices[polygon.b];
			var v3 = object.vertices[polygon.c];
			
			var n1 = object.normals[polygon.na];
			var n2 = object.normals[polygon.nb];
			var n3 = object.normals[polygon.nc];
			
			var faceNormal = object.calculateNormal(v1,v2,v3);
			
			//cull backfacing polygons
			if(object.isFacingCamera(faceNormal,v1,v2,v3,camera))
			{
			
				var p1 = applyProjection(v1,camera);
				var p2 = applyProjection(v2,camera);
				var p3 = applyProjection(v3,camera);
				
				if(n1 == undefined || n2 == undefined || n3 == undefined)
				{
					continue;
				}
				var pixels = object.getAllPixelsInTriangle(p1,p2,p3);
				if(pixels.length > 0)
				{
					for(var p in pixels)
					{
						var pixel = pixels[p];
						
						var pixelNormal = object.interpolateVector3(
							{x:pixel.x, y:pixel.y},
							p1,p2,p3,
							n1,
							n2,
							n3);

						var pixelPosition = object.interpolateVector3(
							{x:pixel.x, y:pixel.y},
							p1,p2,p3,
							v1,
							v2,
							v3);
							
						var colour = object.calculatePhongShadingColourValue(pixelPosition,pixelNormal,light);
						
						setPixel(imageData, pixel.x, pixel.y, colour.r, colour.g, colour.b, 255);
					}
				}
				
				
			}
				
		}

		object.translateMesh(-object.meshPosition.x,-object.meshPosition.y,-object.meshPosition.z,false);

	}

	context.putImageData(imageData, 0, 0);
	
	renderComplete = true;

}


function setPixel(imageData, x, y, r, g, b, a) {
    var index = (x + y * imageData.width) * 4;
    imageData.data[index+0] = r;
    imageData.data[index+1] = g;
    imageData.data[index+2] = b;
    imageData.data[index+3] = a;
}


function handleMouseMove(e)
{
	//objects.members[0].meshPosition.x = e.x - screenWidth/2;
	//objects.members[0].meshPosition.y = e.y - screenHeight/2;
	var dx = oldMousePos.x - e.x;
	var dy = oldMousePos.y - e.y;
	
	objects[0].rotateMesh(-dy/30,dx/30,0);
	
	oldMousePos.x = e.x;
	oldMousePos.y = e.y;
}





//Classes


//Camera
function Camera3D()
{
	this.position = {x: 0, y: 0, z: -500};
	this.focalLength = 1000;
}

//Light
function Light3D()
{
	this.position = {x: 0, y: 0, z: -300};
	this.ambientColour = {r: 0, g: 0, b: 0};
	this.diffuseColour = {r: 200, g: 250, b: 0};
	this.specularColour = {r: 255, g: 255, b: 255};
}

//Game Object
function Object3D()
{
	this.vertices = [];
	this.mesh = [];
	this.normals = [];
	this.meshPosition = {x:0,y:0,z:0};
	this.cull = true;

	this.initMesh = function(data)
	{
		if(data != null)
		{
			this.parseOBJLines(data);
		}
		else
		{
			this.cull = false;
			this.createCubeMesh();
		}
	}
	
	
	
	this.update = function()
	{
		//this.rotateMesh(0.005,0.005,0.005);
	}
	
	
	this.calculatePolygonIllumination = function(normal,v1,v2,v3,lightSrc)
	{
		//calculate light to surface vector
		var maxX = Math.max(v1.x, Math.max(v2.x,v3.x));
		var minX = Math.min(v1.x, Math.min(v2.x,v3.x));
		var maxY = Math.max(v1.y, Math.max(v2.y,v3.y));
		var minY = Math.min(v1.y, Math.min(v2.y,v3.y));
		var maxZ = Math.max(v1.z, Math.max(v2.z,v3.z));
		var minZ = Math.min(v1.z, Math.min(v2.z,v3.z));
		var centroid = { x: (minX+maxX)/2, y: (minY+maxY)/2, z: (minZ+maxZ)/2 };
		var lightToSurface = {x: (lightSrc.position.x - centroid.x), y: (lightSrc.position.y - centroid.y), z: (lightSrc.position.z - centroid.z)};

		//calculate light intensity based on light to surface vectors similarity with the normal of the polygon
		var intensity = this.cosSimilarity(normal,lightToSurface);
		
		//generate the new colour based on the base colours and the light intensity
		var colour = {r:0,g:0,b:0};
		colour.r = lightSrc.ambientColour.r + intensity*lightSrc.diffuseColour.r;
		colour.g = lightSrc.ambientColour.g + intensity*lightSrc.diffuseColour.g;
		colour.b = lightSrc.ambientColour.b + intensity*lightSrc.diffuseColour.b;
		
		return colour;
	}
	
	this.calculatePixelIllumination = function(pixelPos,normal,lightSrc)
	{
		var lightToSurface = {x: (lightSrc.position.x - pixelPos.x), y: (lightSrc.position.y - pixelPos.y), z: (lightSrc.position.z - pixelPos.z)};
		//calculate light intensity based on light to surface vectors similarity with the normal of the polygon
		var intensity = this.cosSimilarity(normal,lightToSurface);
		
		//generate the new colour based on the base colours and the light intensity
		var colour = {r:0,g:0,b:0};
		colour.r = lightSrc.ambientColour.r + intensity*lightSrc.diffuseColour.r;
		colour.g = lightSrc.ambientColour.g + intensity*lightSrc.diffuseColour.g;
		colour.b = lightSrc.ambientColour.b + intensity*lightSrc.diffuseColour.b;
		
		return colour;
	}
	
	
	this.calculatePhongShadingColourValue = function(pixelPos,normal,lightSrc)
	{

		//diffuse reflectivity
		var Kd = 1.0;
		//specular reflectivity
		var Ks = 1.0;
		//light intensity
		var Ip = 1.0;
		//ambient light intensity
		var Ia = 1.0;
		//specular power
		var Ns = 2.0;
		
		var newPixelPos = {x: pixelPos.x - this.meshPosition.x, y: pixelPos.y - this.meshPosition.y, z: pixelPos.z - this.meshPosition.z}

		var lightToSurface = {x: (lightSrc.position.x - newPixelPos.x), y: (lightSrc.position.y - newPixelPos.y), z: (lightSrc.position.z - newPixelPos.z)};
		var reflectanceVector = this.calculateReflectanceVector(normal,lightToSurface);

		//compute ambient componant
		var diffuseVal = Ip * Kd * this.cosSimilarity(normal,lightToSurface);

		//compute specular companant
		var specularVal = Ip * Ks * Math.pow(this.cosSimilarity(reflectanceVector,newPixelPos),Ns);

		var colour = {r:0, g:0, b:0};
		
		colour.r = ( (Ia*lightSrc.ambientColour.r) + (lightSrc.diffuseColour.r*diffuseVal) + (lightSrc.specularColour.r*specularVal) );
		colour.g = ( (Ia*lightSrc.ambientColour.g) + (lightSrc.diffuseColour.g*diffuseVal) + (lightSrc.specularColour.g*specularVal) );
		colour.b = ( (Ia*lightSrc.ambientColour.b) + (lightSrc.diffuseColour.b*diffuseVal) + (lightSrc.specularColour.b*specularVal) );
		
		colour.r = Math.min(Math.max(colour.r,0),255);
		colour.g = Math.min(Math.max(colour.g,0),255);
		colour.b = Math.min(Math.max(colour.b,0),255);

		return colour;
	}
	
	
	
	

	this.crossProduct = function(A, B)
	{
		var V = {x:0, y:0, z:0};
		V.x = (A.y*B.z)-(A.z*B.y);
		V.y = (A.z*B.x)-(A.x*B.z);
		V.z = (A.x*B.y)-(A.y*B.x);
		return V;
	}

	this.dotProduct = function(A, B)
	{
		var sum = ((A.x*B.x)+(A.y*B.y)+(A.z*B.z));
		return sum;
	}

	this.vectorSum = function(A)
	{
		var sum = (Math.abs(A.x)+Math.abs(A.y)+Math.abs(A.z));
		return sum;
	}

	this.euclidianDistance = function(A, B)
	{
		var x2 = Math.pow(B.x-A.x,2);
		var y2 = Math.pow(B.y-A.y,2);
		var z2 = Math.pow(B.z-A.z,2);
		var val = Math.sqrt(x2+y2+z2);
		return val;
	}

	this.calculateNormal = function(A, B, C)
	{
		var P = {x:0,y:0,z:0};
		var Q = {x:0,y:0,z:0};

		P.x = B.x - A.x;
		P.y = B.y - A.y;
		P.z = B.z - A.z;

		Q.x = C.x - A.x;
		Q.y = C.y - A.y;
		Q.z = C.z - A.z;

		var N = this.crossProduct(P,Q);
		return N;
	}
	
	
	
	this.calculateReflectanceVector = function(N,L)
	{
		var R = {x:0,y:0,z:0};
		var dp = this.dotProduct(L,N);
		R.x = L.x-(2*(N.x*(dp)));
		R.y = L.y-(2*(N.y*(dp)));
		R.z = L.z-(2*(N.z*(dp)));
		return R;
	}

	this.cosSimilarity = function(P,Q)
	{
		var sim = (this.dotProduct(P,Q)/(this.vectorSum(P)*this.vectorSum(Q)));
		return sim;
	}

	this.isFacingCamera = function(N,v1,v2,v3,Cam)
	{
		if(!this.cull){return true}; 

		var maxX = Math.max(v1.x, Math.max(v2.x,v3.x));
		var minX = Math.min(v1.x, Math.min(v2.x,v3.x));
		var maxY = Math.max(v1.y, Math.max(v2.y,v3.y));
		var minY = Math.min(v1.y, Math.min(v2.y,v3.y));
		var maxZ = Math.max(v1.z, Math.max(v2.z,v3.z));
		var minZ = Math.min(v1.z, Math.min(v2.z,v3.z));	
		var centroid = { x: (minX+maxX)/2, y: (minY+maxY)/2, z: (minZ+maxZ)/2 };
		
		var cameraToPolygon = { x: Cam.position.x - centroid.x, y: Cam.position.y-centroid.y, z: Cam.position.z-centroid.z };

		if(N.z > 0 && this.cosSimilarity(N,cameraToPolygon) <= 0.0)
		{
			return false;
		}
		else
		{
			return true;
		}
	}



	this.translateMesh = function(DX,DY,DZ,update)
	{
		for (var i = 0; i < this.vertices.length; i++)  
		{
			var point = this.vertices[i];
			var newPoint = {x: (point.x+DX), y: (point.y+DY), z: (point.z+DZ)};
			this.vertices[i] = newPoint;
		}

		if(update)
		{
			this.meshPosition.x += DX;
			this.meshPosition.y += DY;
			this.meshPosition.z += DZ;
		}
	}

	this.scaleMesh = function(SX,SY,SZ)
	{
		for (var i = 0; i < this.vertices.length; i++)  
		{
			var point = this.vertices[i];
			var newPoint = {x: (point.x*SX), y: (point.y*SY), z: (point.z*SZ)};
			this.vertices[i] = newPoint;
		}
	}

	this.rotateMesh = function(AX,AY,AZ)
	{
		var x;
		var y;
		var z;
		var newX;
		var newY;
		var newZ;
		
		//return;

		this.translateMesh(-this.meshPosition.x, -this.meshPosition.y, -this.meshPosition.z, false); //translate to origin

		for (var i = 0 ; i < this.vertices.length; i++)  
		{
			var point = this.vertices[i];

			x = point.x;
			y = point.y;
			z = point.z;

			//X rotation
			newZ = z*Math.cos(AX) - y*Math.sin(AX);
			newY = y*Math.cos(AX) + z*Math.sin(AX);
			y = newY;
			z = newZ;

			//Y rotation
			newZ = z*Math.cos(AY) - x*Math.sin(AY);
			newX = x*Math.cos(AY) + z*Math.sin(AY);
			x = newX;

			//Z rotation
			newY = y*Math.cos(AZ) - x*Math.sin(AZ);
			newX = x*Math.cos(AZ) + y*Math.sin(AZ);

			var newPoint = {x: newX,y: newY,z: newZ};

			this.vertices[i] = newPoint;
		}
		
		this.translateMesh(this.meshPosition.x, this.meshPosition.y, this.meshPosition.z, false); //retranslate
		
		//rotate normal vectors
		for(var i = 0; i < this.mesh.length; i++)  
		{
			for(var j = 0; j < 3; j++)
			{
				var k;
				switch(j)
				{
					case 0:
					{
						k = this.mesh[i].na;
						break;
					}
					case 1:
					{
						k = this.mesh[i].nb;
						break;
					}
					case 2:
					{
						k = this.mesh[i].nc;
						break;
					}
				}

				var normal = this.normals[k];
				if(normal == undefined)
				{
					continue;
				}

				x = normal.x;
				y = normal.y;
				z = normal.z;

				//X rotation
				newY = y*Math.cos(AX) - z*Math.sin(AX);
				newZ = z*Math.cos(AX) + y*Math.sin(AX);
				y = newY;
				z = newZ;

				//Y rotation
				newZ = z*Math.cos(AY) - x*Math.sin(AY);
				newX = x*Math.cos(AY) + z*Math.sin(AY);
				x = newX;

				//Z rotation
				newX = x*Math.cos(AZ) - y*Math.sin(AZ);
				newY = y*Math.cos(AZ) + x*Math.sin(AZ);

				var newNormal = {x: newX, y: newY, z: newZ};

				this.normals[k] = newNormal;
			}
		}
		
	}
	
	
	this.getAllPixelsInTriangle = function(A,B,C)
	{
		var bounds = this.getTriangleBounds(A,B,C);
		var points = [];
		for(var i = Math.round(bounds.left); i <= Math.round(bounds.right); i++)
		{
			for(var j = Math.round(bounds.top); j <= Math.round(bounds.bottom); j++)
			{
				var pixel = {x:i, y:j};
				if(this.pointInTriangle(pixel,A,B,C))
				{
					points.push(pixel);
				}
			}
		}
		return points;
	}
	
	
	this.getTriangleBounds = function(A,B,C)
	{
		var left = Math.min(Math.min(A.x,B.x),C.x);
		var right = Math.max(Math.max(A.x,B.x),C.x);
		var top = Math.min(Math.min(A.y,B.y),C.y);
		var bottom = Math.max(Math.max(A.y,B.y),C.y);
		
		return {left:left, right:right, top:top, bottom:bottom};
	}
	
	
	this.pointInTriangle = function(P,A,B,C)
	{
		var coords = this.getBarycentricCoordinates(P,A,B,C);
		return ((coords.u >= 0) && (coords.v >= 0) && (coords.u + coords.v <= 1));
	}
	
	
	this.getBarycentricCoordinates = function(P,A,B,C)
	{
		// compute vectors C-A, B-A, P-A     
		var v1 = {x:C.x - A.x, y: C.y - A.y, z: 0};
		var v2 = {x:B.x - A.x, y: B.y - A.y, z: 0};
		var v3 = {x:P.x - A.x, y: P.y - A.y, z: 0};

		//compute values for barycentric coordinate calculation
		var dot11 = this.dotProduct(v1, v1);
		var dot12 = this.dotProduct(v1, v2);
		var dot13 = this.dotProduct(v1, v3);
		var dot22 = this.dotProduct(v2, v2);
		var dot23 = this.dotProduct(v2, v3);
		var denom = (1 / (dot11 * dot22 - dot12 * dot12));

		//barycentric coordinates
		var  u = (((dot22 * dot13) - (dot12 * dot23)) * denom);
		var  v = (((dot11 * dot23) - (dot12 * dot13)) * denom);
		
		var result = {u:u, v:v};
		return result;
	}
	
	
	this.interpolateVector3 = function(P,A,B,C,a3,b3,c3)
	{
		var PA = this.getBarycentricCoordinates(P,A,B,C);
		var PB = this.getBarycentricCoordinates(P,B,C,A);
		var PC = this.getBarycentricCoordinates(P,C,A,B);
		
		var r3 =
				{
					x: (((PB.u + PC.v) * a3.x) + ((PC.u + PA.v) * b3.x) + ((PA.u + PB.v) * c3.x))/3,
					y: (((PB.u + PC.v) * a3.y) + ((PC.u + PA.v) * b3.y) + ((PA.u + PB.v) * c3.y))/3,
					z: (((PB.u + PC.v) * a3.z) + ((PC.u + PA.v) * b3.z) + ((PA.u + PB.v) * c3.z))/3
				}
				
		return r3;
	}

	
	
	
	this.parseOBJLines = function(data)
	{
	
		var minX = Infinity;
		var maxX = -Infinity;
		
		var lines = data.split("#");
		for(var i = 0; i < lines.length; i++)
		{
			var values = lines[i].split(' ');
			if(values[0] == 'v')
			{
				var px = parseFloat(values[2]);
				var py = parseFloat(values[3]);
				var pz = parseFloat(values[4]);

				if(px < minX) minX = px;
				if(px > maxX) maxX = px;
				
				this.vertices.push({x: px, y: py, z: pz} );
			}
			else if(values[0] == 'vn')
			{
				this.normals.push({x: (parseFloat(values[1])), y: (parseFloat(values[2])), z: (parseFloat(values[3]))} );
			}
			else if(values[0] == 'f')
			{
				this.mesh.push({a: parseInt(values[1].split("//")[0])-1, b: parseInt(values[2].split("//")[0])-1, c: parseInt(values[3].split("//")[0])-1,
							    na: parseInt(values[1].split("//")[1])-1, nb: parseInt(values[2].split("//")[1])-1, nc: parseInt(values[3].split("//")[1])-1} );
			}
		}
		
		//normalise and scale mesh
		var factor = 1/(maxX - minX);
		this.scaleMesh(factor*500,factor*500,factor*500);
	}
	
	
	
	this.createCubeMesh = function()
	{
		this.vertices.push({x: -100, y: -100, z: -100});
		this.vertices.push({x:  100, y: -100, z: -100});
		this.vertices.push({x:  100, y:  100, z: -100});
		this.vertices.push({x: -100, y:  100, z: -100});
		
		this.vertices.push({x: -100, y: -100, z: 100});
		this.vertices.push({x:  100, y: -100, z: 100});
		this.vertices.push({x:  100, y:  100, z: 100});
		this.vertices.push({x: -100, y:  100, z: 100});
		
		this.mesh.push({a: 0, b: 1, c: 2, colour:{r:255,g:0,b:0}});
		this.mesh.push({a: 0, b: 2, c: 3, colour:{r:255,g:0,b:0}});
		
		this.mesh.push({a: 4, b: 5, c: 6, colour:{r:0,g:255,b:0}});
		this.mesh.push({a: 4, b: 6, c: 7, colour:{r:0,g:255,b:0}});
		
		this.mesh.push({a: 0, b: 4, c: 5, colour:{r:255,g:0,b:255}});
		this.mesh.push({a: 0, b: 1, c: 5, colour:{r:255,g:0,b:255}});

		this.mesh.push({a: 2, b: 6, c: 7, colour:{r:0,g:0,b:255}});
		this.mesh.push({a: 2, b: 3, c: 7, colour:{r:0,g:0,b:255}});
		
		this.mesh.push({a: 1, b: 2, c: 5, colour:{r:255,g:255,b:0}});
		this.mesh.push({a: 2, b: 5, c: 6, colour:{r:255,g:255,b:0}});
		
		this.mesh.push({a: 0, b: 3, c: 4, colour:{r:0,g:255,b:255}});
		this.mesh.push({a: 3, b: 4, c: 7, colour:{r:0,g:255,b:255}});
	}
	

}



var torus = "v  0.8911 24.6528 0.0000#v  6.8823 22.6576 4.5023#v  7.1945 23.8229 0.0000#v  0.8911 23.4464 4.5023#v  6.0292 19.4740 7.7983#v  0.8911 20.1504 7.7983#v  4.8639 15.1250 9.0047#v  0.8911 15.6481 9.0047#v  3.6986 10.7761 7.7983#v  0.8911 11.1457 7.7983#v  2.8456 7.5925 4.5023#v  0.8911 7.8498 4.5023#v  2.5334 6.4272 0.0000#v  0.8911 6.6434 0.0000#v  2.8456 7.5925 -4.5023#v  0.8911 7.8498 -4.5023#v  3.6986 10.7761 -7.7983#v  0.8911 11.1457 -7.7983#v  4.8639 15.1250 -9.0047#v  0.8911 15.6481 -9.0047#v  6.0292 19.4740 -7.7983#v  0.8911 20.1504 -7.7983#v  6.8823 22.6576 -4.5024#v  0.8911 23.4464 -4.5024#v  12.4652 20.3451 4.5023#v  13.0684 21.3899 0.0000#v  10.8172 17.4907 7.7983#v  8.5661 13.5916 9.0047#v  6.3149 9.6924 7.7983#v  4.6669 6.8381 4.5023#v  4.0637 5.7933 0.0000#v  4.6669 6.8381 -4.5023#v  6.3149 9.6924 -7.7983#v  8.5661 13.5916 -9.0047#v  10.8172 17.4907 -7.7983#v  12.4652 20.3451 -4.5024#v  17.2594 16.6664 4.5023#v  18.1124 17.5194 0.0000#v  14.9288 14.3358 7.7983#v  11.7452 11.1522 9.0047#v  8.5615 7.9685 7.7983#v  6.2309 5.6379 4.5023#v  5.3779 4.7849 0.0000#v  6.2309 5.6379 -4.5023#v  8.5615 7.9685 -7.7983#v  11.7452 11.1522 -9.0047#v  14.9288 14.3358 -7.7983#v  17.2594 16.6664 -4.5024#v  20.9381 11.8722 4.5023#v  21.9829 12.4754 0.0000#v  18.0837 10.2242 7.7983#v  14.1846 7.9731 9.0047#v  10.2854 5.7219 7.7983#v  7.4311 4.0739 4.5023#v  6.3863 3.4707 0.0000#v  7.4311 4.0739 -4.5023#v  10.2854 5.7219 -7.7983#v  14.1846 7.9731 -9.0047#v  18.0837 10.2242 -7.7983#v  20.9381 11.8722 -4.5024#v  23.2506 6.2893 4.5023#v  24.4159 6.6015 0.0000#v  20.0670 5.4362 7.7983#v  15.7181 4.2709 9.0047#v  11.3691 3.1056 7.7983#v  8.1855 2.2526 4.5023#v  7.0202 1.9403 0.0000#v  8.1855 2.2526 -4.5023#v  11.3691 3.1056 -7.7983#v  15.7180 4.2709 -9.0047#v  20.0670 5.4362 -7.7983#v  23.2506 6.2893 -4.5024#v  24.0394 0.2981 4.5023#v  25.2458 0.2981 0.0000#v  20.7434 0.2981 7.7983#v  16.2411 0.2981 9.0047#v  11.7387 0.2981 7.7983#v  8.4428 0.2981 4.5023#v  7.2364 0.2981 0.0000#v  8.4428 0.2981 -4.5023#v  11.7387 0.2981 -7.7983#v  16.2411 0.2981 -9.0047#v  20.7434 0.2981 -7.7983#v  24.0394 0.2981 -4.5024#v  23.2506 -5.6932 4.5023#v  24.4159 -6.0054 0.0000#v  20.0670 -4.8401 7.7983#v  15.7181 -3.6748 9.0047#v  11.3691 -2.5095 7.7983#v  8.1855 -1.6565 4.5023#v  7.0202 -1.3442 0.0000#v  8.1855 -1.6565 -4.5023#v  11.3691 -2.5095 -7.7983#v  15.7180 -3.6748 -9.0047#v  20.0670 -4.8401 -7.7983#v  23.2506 -5.6932 -4.5024#v  20.9381 -11.2761 4.5023#v  21.9829 -11.8793 0.0000#v  18.0837 -9.6281 7.7983#v  14.1846 -7.3770 9.0047#v  10.2854 -5.1258 7.7983#v  7.4311 -3.4778 4.5023#v  6.3863 -2.8746 0.0000#v  7.4311 -3.4778 -4.5023#v  10.2854 -5.1258 -7.7983#v  14.1846 -7.3770 -9.0047#v  18.0837 -9.6281 -7.7983#v  20.9381 -11.2761 -4.5024#v  17.2594 -16.0703 4.5023#v  18.1124 -16.9233 0.0000#v  14.9288 -13.7397 7.7983#v  11.7452 -10.5561 9.0047#v  8.5615 -7.3724 7.7983#v  6.2309 -5.0418 4.5023#v  5.3779 -4.1888 0.0000#v  6.2309 -5.0418 -4.5023#v  8.5615 -7.3724 -7.7983#v  11.7452 -10.5561 -9.0047#v  14.9288 -13.7397 -7.7983#v  17.2594 -16.0703 -4.5024#v  12.4652 -19.7490 4.5023#v  13.0684 -20.7938 0.0000#v  10.8172 -16.8946 7.7983#v  8.5661 -12.9955 9.0047#v  6.3149 -9.0963 7.7983#v  4.6669 -6.2419 4.5023#v  4.0637 -5.1972 0.0000#v  4.6669 -6.2419 -4.5023#v  6.3149 -9.0963 -7.7983#v  8.5661 -12.9955 -9.0047#v  10.8172 -16.8946 -7.7983#v  12.4652 -19.7490 -4.5024#v  6.8823 -22.0615 4.5023#v  7.1945 -23.2268 0.0000#v  6.0292 -18.8779 7.7983#v  4.8639 -14.5289 9.0047#v  3.6986 -10.1800 7.7983#v  2.8456 -6.9964 4.5023#v  2.5334 -5.8311 0.0000#v  2.8456 -6.9964 -4.5023#v  3.6986 -10.1800 -7.7983#v  4.8639 -14.5289 -9.0047#v  6.0292 -18.8779 -7.7983#v  6.8823 -22.0615 -4.5024#v  0.8911 -22.8503 4.5023#v  0.8911 -24.0567 0.0000#v  0.8911 -19.5543 7.7983#v  0.8911 -15.0520 9.0047#v  0.8911 -10.5496 7.7983#v  0.8911 -7.2537 4.5023#v  0.8911 -6.0473 0.0000#v  0.8911 -7.2537 -4.5023#v  0.8911 -10.5496 -7.7983#v  0.8911 -15.0520 -9.0047#v  0.8911 -19.5543 -7.7983#v  0.8911 -22.8503 -4.5024#v  -5.1002 -22.0615 4.5023#v  -5.4124 -23.2268 0.0000#v  -4.2471 -18.8779 7.7983#v  -3.0818 -14.5289 9.0047#v  -1.9165 -10.1800 7.7983#v  -1.0635 -6.9964 4.5023#v  -0.7512 -5.8311 0.0000#v  -1.0635 -6.9964 -4.5023#v  -1.9165 -10.1800 -7.7983#v  -3.0818 -14.5289 -9.0047#v  -4.2471 -18.8779 -7.7983#v  -5.1002 -22.0615 -4.5024#v  -10.6831 -19.7490 4.5023#v  -11.2863 -20.7938 0.0000#v  -9.0351 -16.8946 7.7983#v  -6.7840 -12.9955 9.0047#v  -4.5328 -9.0963 7.7983#v  -2.8848 -6.2419 4.5023#v  -2.2816 -5.1972 0.0000#v  -2.8848 -6.2419 -4.5023#v  -4.5328 -9.0963 -7.7983#v  -6.7840 -12.9955 -9.0047#v  -9.0351 -16.8946 -7.7983#v  -10.6831 -19.7490 -4.5024#v  -15.4773 -16.0703 4.5023#v  -16.3303 -16.9233 0.0000#v  -13.1467 -13.7397 7.7983#v  -9.9631 -10.5561 9.0047#v  -6.7794 -7.3724 7.7983#v  -4.4488 -5.0418 4.5023#v  -3.5958 -4.1888 0.0000#v  -4.4488 -5.0418 -4.5023#v  -6.7794 -7.3724 -7.7983#v  -9.9630 -10.5561 -9.0047#v  -13.1467 -13.7397 -7.7983#v  -15.4773 -16.0703 -4.5024#v  -19.1560 -11.2761 4.5023#v  -20.2008 -11.8793 0.0000#v  -16.3016 -9.6281 7.7983#v  -12.4025 -7.3770 9.0047#v  -8.5033 -5.1258 7.7983#v  -5.6489 -3.4778 4.5023#v  -4.6042 -2.8746 0.0000#v  -5.6489 -3.4778 -4.5023#v  -8.5033 -5.1258 -7.7983#v  -12.4025 -7.3770 -9.0047#v  -16.3016 -9.6281 -7.7983#v  -19.1560 -11.2761 -4.5024#v  -21.4685 -5.6932 4.5023#v  -22.6338 -6.0054 0.0000#v  -18.2849 -4.8401 7.7983#v  -13.9359 -3.6748 9.0047#v  -9.5870 -2.5095 7.7983#v  -6.4034 -1.6565 4.5023#v  -5.2381 -1.3442 0.0000#v  -6.4034 -1.6565 -4.5023#v  -9.5870 -2.5095 -7.7983#v  -13.9359 -3.6748 -9.0047#v  -18.2849 -4.8401 -7.7983#v  -21.4685 -5.6932 -4.5024#v  -22.2573 0.2980 4.5023#v  -23.4637 0.2980 0.0000#v  -18.9613 0.2980 7.7983#v  -14.4590 0.2980 9.0047#v  -9.9566 0.2981 7.7983#v  -6.6607 0.2981 4.5023#v  -5.4543 0.2981 0.0000#v  -6.6607 0.2981 -4.5023#v  -9.9566 0.2981 -7.7983#v  -14.4590 0.2980 -9.0047#v  -18.9613 0.2980 -7.7983#v  -22.2573 0.2980 -4.5024#v  -21.4685 6.2893 4.5023#v  -22.6338 6.6015 0.0000#v  -18.2849 5.4362 7.7983#v  -13.9359 4.2709 9.0047#v  -9.5870 3.1056 7.7983#v  -6.4034 2.2526 4.5023#v  -5.2381 1.9403 0.0000#v  -6.4034 2.2526 -4.5023#v  -9.5870 3.1056 -7.7983#v  -13.9359 4.2709 -9.0047#v  -18.2849 5.4362 -7.7983#v  -21.4685 6.2893 -4.5024#v  -19.1560 11.8722 4.5023#v  -20.2008 12.4754 0.0000#v  -16.3016 10.2242 7.7983#v  -12.4025 7.9731 9.0047#v  -8.5033 5.7219 7.7983#v  -5.6489 4.0739 4.5023#v  -4.6042 3.4707 0.0000#v  -5.6489 4.0739 -4.5023#v  -8.5033 5.7219 -7.7983#v  -12.4025 7.9731 -9.0047#v  -16.3016 10.2242 -7.7983#v  -19.1560 11.8722 -4.5024#v  -15.4773 16.6664 4.5023#v  -16.3303 17.5194 0.0000#v  -13.1467 14.3358 7.7983#v  -9.9631 11.1522 9.0047#v  -6.7794 7.9685 7.7983#v  -4.4488 5.6379 4.5023#v  -3.5958 4.7849 0.0000#v  -4.4488 5.6379 -4.5023#v  -6.7794 7.9685 -7.7983#v  -9.9631 11.1522 -9.0047#v  -13.1467 14.3358 -7.7983#v  -15.4773 16.6664 -4.5024#v  -10.6831 20.3451 4.5023#v  -11.2863 21.3899 0.0000#v  -9.0351 17.4907 7.7983#v  -6.7840 13.5916 9.0047#v  -4.5328 9.6924 7.7983#v  -2.8848 6.8381 4.5023#v  -2.2816 5.7933 0.0000#v  -2.8848 6.8381 -4.5023#v  -4.5328 9.6924 -7.7983#v  -6.7840 13.5916 -9.0047#v  -9.0351 17.4907 -7.7983#v  -10.6831 20.3451 -4.5024#v  -5.1002 22.6576 4.5023#v  -5.4124 23.8229 0.0000#v  -4.2471 19.4740 7.7983#v  -3.0818 15.1250 9.0047#v  -1.9165 10.7761 7.7983#v  -1.0635 7.5925 4.5023#v  -0.7512 6.4272 0.0000#v  -1.0635 7.5925 -4.5023#v  -1.9165 10.7761 -7.7983#v  -3.0818 15.1250 -9.0047#v  -4.2471 19.4740 -7.7983#v  -5.1002 22.6576 -4.5024#vn -0.0000 1.0000 -0.0000#vn 0.2255 0.8415 0.4909#vn 0.2588 0.9659 -0.0000#vn -0.0000 1.0000 -0.0000#vn -0.0000 0.8712 0.4909#vn 0.2255 0.8415 0.4909#vn -0.0000 0.8712 0.4909#vn 0.1335 0.4982 0.8567#vn 0.2255 0.8415 0.4909#vn -0.0000 0.8712 0.4909#vn -0.0000 0.5158 0.8567#vn 0.1335 0.4982 0.8567#vn -0.0000 0.5158 0.8567#vn 0.0056 0.0208 0.9998#vn 0.1335 0.4982 0.8567#vn -0.0000 0.5158 0.8567#vn -0.0000 0.0216 0.9998#vn 0.0056 0.0208 0.9998#vn -0.0000 0.0216 0.9998#vn -0.1251 -0.4670 0.8753#vn 0.0056 0.0208 0.9998#vn -0.0000 0.0216 0.9998#vn 0.0000 -0.4835 0.8753#vn -0.1251 -0.4670 0.8753#vn 0.0000 -0.4835 0.8753#vn -0.2227 -0.8311 0.5096#vn -0.1251 -0.4670 0.8753#vn 0.0000 -0.4835 0.8753#vn 0.0000 -0.8604 0.5096#vn -0.2227 -0.8311 0.5096#vn 0.0000 -0.8604 0.5096#vn -0.2588 -0.9659 0.0000#vn -0.2227 -0.8311 0.5096#vn 0.0000 -0.8604 0.5096#vn 0.0000 -1.0000 0.0000#vn -0.2588 -0.9659 0.0000#vn 0.0000 -1.0000 0.0000#vn -0.2227 -0.8311 -0.5096#vn -0.2588 -0.9659 0.0000#vn 0.0000 -1.0000 0.0000#vn 0.0000 -0.8604 -0.5096#vn -0.2227 -0.8311 -0.5096#vn 0.0000 -0.8604 -0.5096#vn -0.1251 -0.4670 -0.8753#vn -0.2227 -0.8311 -0.5096#vn 0.0000 -0.8604 -0.5096#vn 0.0000 -0.4835 -0.8753#vn -0.1251 -0.4670 -0.8753#vn 0.0000 -0.4835 -0.8753#vn 0.0056 0.0208 -0.9998#vn -0.1251 -0.4670 -0.8753#vn 0.0000 -0.4835 -0.8753#vn -0.0000 0.0216 -0.9998#vn 0.0056 0.0208 -0.9998#vn -0.0000 0.0216 -0.9998#vn 0.1335 0.4982 -0.8567#vn 0.0056 0.0208 -0.9998#vn -0.0000 0.0216 -0.9998#vn -0.0000 0.5158 -0.8567#vn 0.1335 0.4982 -0.8567#vn -0.0000 0.5158 -0.8567#vn 0.2255 0.8415 -0.4909#vn 0.1335 0.4982 -0.8567#vn -0.0000 0.5158 -0.8567#vn -0.0000 0.8712 -0.4909#vn 0.2255 0.8415 -0.4909#vn -0.0000 0.8712 -0.4909#vn 0.2588 0.9659 -0.0000#vn 0.2255 0.8415 -0.4909#vn -0.0000 0.8712 -0.4909#vn -0.0000 1.0000 -0.0000#vn 0.2588 0.9659 -0.0000#vn 0.2588 0.9659 -0.0000#vn 0.4356 0.7545 0.4909#vn 0.5000 0.8660 -0.0000#vn 0.2588 0.9659 -0.0000#vn 0.2255 0.8415 0.4909#vn 0.4356 0.7545 0.4909#vn 0.2255 0.8415 0.4909#vn 0.2579 0.4467 0.8567#vn 0.4356 0.7545 0.4909#vn 0.2255 0.8415 0.4909#vn 0.1335 0.4982 0.8567#vn 0.2579 0.4467 0.8567#vn 0.1335 0.4982 0.8567#vn 0.0108 0.0187 0.9998#vn 0.2579 0.4467 0.8567#vn 0.1335 0.4982 0.8567#vn 0.0056 0.0208 0.9998#vn 0.0108 0.0187 0.9998#vn 0.0056 0.0208 0.9998#vn -0.2417 -0.4187 0.8753#vn 0.0108 0.0187 0.9998#vn 0.0056 0.0208 0.9998#vn -0.1251 -0.4670 0.8753#vn -0.2417 -0.4187 0.8753#vn -0.1251 -0.4670 0.8753#vn -0.4302 -0.7452 0.5096#vn -0.2417 -0.4187 0.8753#vn -0.1251 -0.4670 0.8753#vn -0.2227 -0.8311 0.5096#vn -0.4302 -0.7452 0.5096#vn -0.2227 -0.8311 0.5096#vn -0.5000 -0.8660 0.0000#vn -0.4302 -0.7452 0.5096#vn -0.2227 -0.8311 0.5096#vn -0.2588 -0.9659 0.0000#vn -0.5000 -0.8660 0.0000#vn -0.2588 -0.9659 0.0000#vn -0.4302 -0.7452 -0.5096#vn -0.5000 -0.8660 0.0000#vn -0.2588 -0.9659 0.0000#vn -0.2227 -0.8311 -0.5096#vn -0.4302 -0.7452 -0.5096#vn -0.2227 -0.8311 -0.5096#vn -0.2417 -0.4187 -0.8753#vn -0.4302 -0.7452 -0.5096#vn -0.2227 -0.8311 -0.5096#vn -0.1251 -0.4670 -0.8753#vn -0.2417 -0.4187 -0.8753#vn -0.1251 -0.4670 -0.8753#vn 0.0108 0.0187 -0.9998#vn -0.2417 -0.4187 -0.8753#vn -0.1251 -0.4670 -0.8753#vn 0.0056 0.0208 -0.9998#vn 0.0108 0.0187 -0.9998#vn 0.0056 0.0208 -0.9998#vn 0.2579 0.4467 -0.8567#vn 0.0108 0.0187 -0.9998#vn 0.0056 0.0208 -0.9998#vn 0.1335 0.4982 -0.8567#vn 0.2579 0.4467 -0.8567#vn 0.1335 0.4982 -0.8567#vn 0.4356 0.7545 -0.4909#vn 0.2579 0.4467 -0.8567#vn 0.1335 0.4982 -0.8567#vn 0.2255 0.8415 -0.4909#vn 0.4356 0.7545 -0.4909#vn 0.2255 0.8415 -0.4909#vn 0.5000 0.8660 -0.0000#vn 0.4356 0.7545 -0.4909#vn 0.2255 0.8415 -0.4909#vn 0.2588 0.9659 -0.0000#vn 0.5000 0.8660 -0.0000#vn 0.5000 0.8660 -0.0000#vn 0.6160 0.6160 0.4909#vn 0.7071 0.7071 -0.0000#vn 0.5000 0.8660 -0.0000#vn 0.4356 0.7545 0.4909#vn 0.6160 0.6160 0.4909#vn 0.4356 0.7545 0.4909#vn 0.3647 0.3647 0.8567#vn 0.6160 0.6160 0.4909#vn 0.4356 0.7545 0.4909#vn 0.2579 0.4467 0.8567#vn 0.3647 0.3647 0.8567#vn 0.2579 0.4467 0.8567#vn 0.0152 0.0152 0.9998#vn 0.3647 0.3647 0.8567#vn 0.2579 0.4467 0.8567#vn 0.0108 0.0187 0.9998#vn 0.0152 0.0152 0.9998#vn 0.0108 0.0187 0.9998#vn -0.3419 -0.3419 0.8753#vn 0.0152 0.0152 0.9998#vn 0.0108 0.0187 0.9998#vn -0.2417 -0.4187 0.8753#vn -0.3419 -0.3419 0.8753#vn -0.2417 -0.4187 0.8753#vn -0.6084 -0.6084 0.5096#vn -0.3419 -0.3419 0.8753#vn -0.2417 -0.4187 0.8753#vn -0.4302 -0.7452 0.5096#vn -0.6084 -0.6084 0.5096#vn -0.4302 -0.7452 0.5096#vn -0.7071 -0.7071 0.0000#vn -0.6084 -0.6084 0.5096#vn -0.4302 -0.7452 0.5096#vn -0.5000 -0.8660 0.0000#vn -0.7071 -0.7071 0.0000#vn -0.5000 -0.8660 0.0000#vn -0.6084 -0.6084 -0.5095#vn -0.7071 -0.7071 0.0000#vn -0.5000 -0.8660 0.0000#vn -0.4302 -0.7452 -0.5096#vn -0.6084 -0.6084 -0.5095#vn -0.4302 -0.7452 -0.5096#vn -0.3419 -0.3419 -0.8753#vn -0.6084 -0.6084 -0.5095#vn -0.4302 -0.7452 -0.5096#vn -0.2417 -0.4187 -0.8753#vn -0.3419 -0.3419 -0.8753#vn -0.2417 -0.4187 -0.8753#vn 0.0152 0.0152 -0.9998#vn -0.3419 -0.3419 -0.8753#vn -0.2417 -0.4187 -0.8753#vn 0.0108 0.0187 -0.9998#vn 0.0152 0.0152 -0.9998#vn 0.0108 0.0187 -0.9998#vn 0.3647 0.3647 -0.8567#vn 0.0152 0.0152 -0.9998#vn 0.0108 0.0187 -0.9998#vn 0.2579 0.4467 -0.8567#vn 0.3647 0.3647 -0.8567#vn 0.2579 0.4467 -0.8567#vn 0.6160 0.6160 -0.4909#vn 0.3647 0.3647 -0.8567#vn 0.2579 0.4467 -0.8567#vn 0.4356 0.7545 -0.4909#vn 0.6160 0.6160 -0.4909#vn 0.4356 0.7545 -0.4909#vn 0.7071 0.7071 -0.0000#vn 0.6160 0.6160 -0.4909#vn 0.4356 0.7545 -0.4909#vn 0.5000 0.8660 -0.0000#vn 0.7071 0.7071 -0.0000#vn 0.7071 0.7071 -0.0000#vn 0.7545 0.4356 0.4909#vn 0.8660 0.5000 -0.0000#vn 0.7071 0.7071 -0.0000#vn 0.6160 0.6160 0.4909#vn 0.7545 0.4356 0.4909#vn 0.6160 0.6160 0.4909#vn 0.4467 0.2579 0.8567#vn 0.7545 0.4356 0.4909#vn 0.6160 0.6160 0.4909#vn 0.3647 0.3647 0.8567#vn 0.4467 0.2579 0.8567#vn 0.3647 0.3647 0.8567#vn 0.0187 0.0108 0.9998#vn 0.4467 0.2579 0.8567#vn 0.3647 0.3647 0.8567#vn 0.0152 0.0152 0.9998#vn 0.0187 0.0108 0.9998#vn 0.0152 0.0152 0.9998#vn -0.4187 -0.2417 0.8753#vn 0.0187 0.0108 0.9998#vn 0.0152 0.0152 0.9998#vn -0.3419 -0.3419 0.8753#vn -0.4187 -0.2417 0.8753#vn -0.3419 -0.3419 0.8753#vn -0.7452 -0.4302 0.5096#vn -0.4187 -0.2417 0.8753#vn -0.3419 -0.3419 0.8753#vn -0.6084 -0.6084 0.5096#vn -0.7452 -0.4302 0.5096#vn -0.6084 -0.6084 0.5096#vn -0.8660 -0.5000 0.0000#vn -0.7452 -0.4302 0.5096#vn -0.6084 -0.6084 0.5096#vn -0.7071 -0.7071 0.0000#vn -0.8660 -0.5000 0.0000#vn -0.7071 -0.7071 0.0000#vn -0.7452 -0.4302 -0.5096#vn -0.8660 -0.5000 0.0000#vn -0.7071 -0.7071 0.0000#vn -0.6084 -0.6084 -0.5095#vn -0.7452 -0.4302 -0.5096#vn -0.6084 -0.6084 -0.5095#vn -0.4187 -0.2417 -0.8753#vn -0.7452 -0.4302 -0.5096#vn -0.6084 -0.6084 -0.5095#vn -0.3419 -0.3419 -0.8753#vn -0.4187 -0.2417 -0.8753#vn -0.3419 -0.3419 -0.8753#vn 0.0187 0.0108 -0.9998#vn -0.4187 -0.2417 -0.8753#vn -0.3419 -0.3419 -0.8753#vn 0.0152 0.0152 -0.9998#vn 0.0187 0.0108 -0.9998#vn 0.0152 0.0152 -0.9998#vn 0.4467 0.2579 -0.8567#vn 0.0187 0.0108 -0.9998#vn 0.0152 0.0152 -0.9998#vn 0.3647 0.3647 -0.8567#vn 0.4467 0.2579 -0.8567#vn 0.3647 0.3647 -0.8567#vn 0.7545 0.4356 -0.4909#vn 0.4467 0.2579 -0.8567#vn 0.3647 0.3647 -0.8567#vn 0.6160 0.6160 -0.4909#vn 0.7545 0.4356 -0.4909#vn 0.6160 0.6160 -0.4909#vn 0.8660 0.5000 -0.0000#vn 0.7545 0.4356 -0.4909#vn 0.6160 0.6160 -0.4909#vn 0.7071 0.7071 -0.0000#vn 0.8660 0.5000 -0.0000#vn 0.8660 0.5000 -0.0000#vn 0.8415 0.2255 0.4909#vn 0.9659 0.2588 -0.0000#vn 0.8660 0.5000 -0.0000#vn 0.7545 0.4356 0.4909#vn 0.8415 0.2255 0.4909#vn 0.7545 0.4356 0.4909#vn 0.4982 0.1335 0.8567#vn 0.8415 0.2255 0.4909#vn 0.7545 0.4356 0.4909#vn 0.4467 0.2579 0.8567#vn 0.4982 0.1335 0.8567#vn 0.4467 0.2579 0.8567#vn 0.0208 0.0056 0.9998#vn 0.4982 0.1335 0.8567#vn 0.4467 0.2579 0.8567#vn 0.0187 0.0108 0.9998#vn 0.0208 0.0056 0.9998#vn 0.0187 0.0108 0.9998#vn -0.4670 -0.1251 0.8753#vn 0.0208 0.0056 0.9998#vn 0.0187 0.0108 0.9998#vn -0.4187 -0.2417 0.8753#vn -0.4670 -0.1251 0.8753#vn -0.4187 -0.2417 0.8753#vn -0.8311 -0.2227 0.5096#vn -0.4670 -0.1251 0.8753#vn -0.4187 -0.2417 0.8753#vn -0.7452 -0.4302 0.5096#vn -0.8311 -0.2227 0.5096#vn -0.7452 -0.4302 0.5096#vn -0.9659 -0.2588 0.0000#vn -0.8311 -0.2227 0.5096#vn -0.7452 -0.4302 0.5096#vn -0.8660 -0.5000 0.0000#vn -0.9659 -0.2588 0.0000#vn -0.8660 -0.5000 0.0000#vn -0.8311 -0.2227 -0.5096#vn -0.9659 -0.2588 0.0000#vn -0.8660 -0.5000 0.0000#vn -0.7452 -0.4302 -0.5096#vn -0.8311 -0.2227 -0.5096#vn -0.7452 -0.4302 -0.5096#vn -0.4670 -0.1251 -0.8753#vn -0.8311 -0.2227 -0.5096#vn -0.7452 -0.4302 -0.5096#vn -0.4187 -0.2417 -0.8753#vn -0.4670 -0.1251 -0.8753#vn -0.4187 -0.2417 -0.8753#vn 0.0208 0.0056 -0.9998#vn -0.4670 -0.1251 -0.8753#vn -0.4187 -0.2417 -0.8753#vn 0.0187 0.0108 -0.9998#vn 0.0208 0.0056 -0.9998#vn 0.0187 0.0108 -0.9998#vn 0.4982 0.1335 -0.8567#vn 0.0208 0.0056 -0.9998#vn 0.0187 0.0108 -0.9998#vn 0.4467 0.2579 -0.8567#vn 0.4982 0.1335 -0.8567#vn 0.4467 0.2579 -0.8567#vn 0.8415 0.2255 -0.4909#vn 0.4982 0.1335 -0.8567#vn 0.4467 0.2579 -0.8567#vn 0.7545 0.4356 -0.4909#vn 0.8415 0.2255 -0.4909#vn 0.7545 0.4356 -0.4909#vn 0.9659 0.2588 -0.0000#vn 0.8415 0.2255 -0.4909#vn 0.7545 0.4356 -0.4909#vn 0.8660 0.5000 -0.0000#vn 0.9659 0.2588 -0.0000#vn 0.9659 0.2588 -0.0000#vn 0.8712 0.0000 0.4909#vn 1.0000 0.0000 -0.0000#vn 0.9659 0.2588 -0.0000#vn 0.8415 0.2255 0.4909#vn 0.8712 0.0000 0.4909#vn 0.8415 0.2255 0.4909#vn 0.5158 0.0000 0.8567#vn 0.8712 0.0000 0.4909#vn 0.8415 0.2255 0.4909#vn 0.4982 0.1335 0.8567#vn 0.5158 0.0000 0.8567#vn 0.4982 0.1335 0.8567#vn 0.0216 0.0000 0.9998#vn 0.5158 0.0000 0.8567#vn 0.4982 0.1335 0.8567#vn 0.0208 0.0056 0.9998#vn 0.0216 0.0000 0.9998#vn 0.0208 0.0056 0.9998#vn -0.4835 0.0000 0.8753#vn 0.0216 0.0000 0.9998#vn 0.0208 0.0056 0.9998#vn -0.4670 -0.1251 0.8753#vn -0.4835 0.0000 0.8753#vn -0.4670 -0.1251 0.8753#vn -0.8604 -0.0000 0.5096#vn -0.4835 0.0000 0.8753#vn -0.4670 -0.1251 0.8753#vn -0.8311 -0.2227 0.5096#vn -0.8604 -0.0000 0.5096#vn -0.8311 -0.2227 0.5096#vn -1.0000 0.0000 0.0000#vn -0.8604 -0.0000 0.5096#vn -0.8311 -0.2227 0.5096#vn -0.9659 -0.2588 0.0000#vn -1.0000 0.0000 0.0000#vn -0.9659 -0.2588 0.0000#vn -0.8604 -0.0000 -0.5096#vn -1.0000 0.0000 0.0000#vn -0.9659 -0.2588 0.0000#vn -0.8311 -0.2227 -0.5096#vn -0.8604 -0.0000 -0.5096#vn -0.8311 -0.2227 -0.5096#vn -0.4835 -0.0000 -0.8753#vn -0.8604 -0.0000 -0.5096#vn -0.8311 -0.2227 -0.5096#vn -0.4670 -0.1251 -0.8753#vn -0.4835 -0.0000 -0.8753#vn -0.4670 -0.1251 -0.8753#vn 0.0216 0.0000 -0.9998#vn -0.4835 -0.0000 -0.8753#vn -0.4670 -0.1251 -0.8753#vn 0.0208 0.0056 -0.9998#vn 0.0216 0.0000 -0.9998#vn 0.0208 0.0056 -0.9998#vn 0.5158 -0.0000 -0.8567#vn 0.0216 0.0000 -0.9998#vn 0.0208 0.0056 -0.9998#vn 0.4982 0.1335 -0.8567#vn 0.5158 -0.0000 -0.8567#vn 0.4982 0.1335 -0.8567#vn 0.8712 -0.0000 -0.4909#vn 0.5158 -0.0000 -0.8567#vn 0.4982 0.1335 -0.8567#vn 0.8415 0.2255 -0.4909#vn 0.8712 -0.0000 -0.4909#vn 0.8415 0.2255 -0.4909#vn 1.0000 0.0000 -0.0000#vn 0.8712 -0.0000 -0.4909#vn 0.8415 0.2255 -0.4909#vn 0.9659 0.2588 -0.0000#vn 1.0000 0.0000 -0.0000#vn 1.0000 0.0000 -0.0000#vn 0.8415 -0.2255 0.4909#vn 0.9659 -0.2588 -0.0000#vn 1.0000 0.0000 -0.0000#vn 0.8712 0.0000 0.4909#vn 0.8415 -0.2255 0.4909#vn 0.8712 0.0000 0.4909#vn 0.4982 -0.1335 0.8567#vn 0.8415 -0.2255 0.4909#vn 0.8712 0.0000 0.4909#vn 0.5158 0.0000 0.8567#vn 0.4982 -0.1335 0.8567#vn 0.5158 0.0000 0.8567#vn 0.0208 -0.0056 0.9998#vn 0.4982 -0.1335 0.8567#vn 0.5158 0.0000 0.8567#vn 0.0216 0.0000 0.9998#vn 0.0208 -0.0056 0.9998#vn 0.0216 0.0000 0.9998#vn -0.4670 0.1251 0.8753#vn 0.0208 -0.0056 0.9998#vn 0.0216 0.0000 0.9998#vn -0.4835 0.0000 0.8753#vn -0.4670 0.1251 0.8753#vn -0.4835 0.0000 0.8753#vn -0.8311 0.2227 0.5096#vn -0.4670 0.1251 0.8753#vn -0.4835 0.0000 0.8753#vn -0.8604 -0.0000 0.5096#vn -0.8311 0.2227 0.5096#vn -0.8604 -0.0000 0.5096#vn -0.9659 0.2588 0.0000#vn -0.8311 0.2227 0.5096#vn -0.8604 -0.0000 0.5096#vn -1.0000 0.0000 0.0000#vn -0.9659 0.2588 0.0000#vn -1.0000 0.0000 0.0000#vn -0.8311 0.2227 -0.5095#vn -0.9659 0.2588 0.0000#vn -1.0000 0.0000 0.0000#vn -0.8604 -0.0000 -0.5096#vn -0.8311 0.2227 -0.5095#vn -0.8604 -0.0000 -0.5096#vn -0.4670 0.1251 -0.8753#vn -0.8311 0.2227 -0.5095#vn -0.8604 -0.0000 -0.5096#vn -0.4835 -0.0000 -0.8753#vn -0.4670 0.1251 -0.8753#vn -0.4835 -0.0000 -0.8753#vn 0.0208 -0.0056 -0.9998#vn -0.4670 0.1251 -0.8753#vn -0.4835 -0.0000 -0.8753#vn 0.0216 0.0000 -0.9998#vn 0.0208 -0.0056 -0.9998#vn 0.0216 0.0000 -0.9998#vn 0.4982 -0.1335 -0.8567#vn 0.0208 -0.0056 -0.9998#vn 0.0216 0.0000 -0.9998#vn 0.5158 -0.0000 -0.8567#vn 0.4982 -0.1335 -0.8567#vn 0.5158 -0.0000 -0.8567#vn 0.8415 -0.2255 -0.4909#vn 0.4982 -0.1335 -0.8567#vn 0.5158 -0.0000 -0.8567#vn 0.8712 -0.0000 -0.4909#vn 0.8415 -0.2255 -0.4909#vn 0.8712 -0.0000 -0.4909#vn 0.9659 -0.2588 -0.0000#vn 0.8415 -0.2255 -0.4909#vn 0.8712 -0.0000 -0.4909#vn 1.0000 0.0000 -0.0000#vn 0.9659 -0.2588 -0.0000#vn 0.9659 -0.2588 -0.0000#vn 0.7545 -0.4356 0.4909#vn 0.8660 -0.5000 -0.0000#vn 0.9659 -0.2588 -0.0000#vn 0.8415 -0.2255 0.4909#vn 0.7545 -0.4356 0.4909#vn 0.8415 -0.2255 0.4909#vn 0.4467 -0.2579 0.8567#vn 0.7545 -0.4356 0.4909#vn 0.8415 -0.2255 0.4909#vn 0.4982 -0.1335 0.8567#vn 0.4467 -0.2579 0.8567#vn 0.4982 -0.1335 0.8567#vn 0.0187 -0.0108 0.9998#vn 0.4467 -0.2579 0.8567#vn 0.4982 -0.1335 0.8567#vn 0.0208 -0.0056 0.9998#vn 0.0187 -0.0108 0.9998#vn 0.0208 -0.0056 0.9998#vn -0.4187 0.2417 0.8753#vn 0.0187 -0.0108 0.9998#vn 0.0208 -0.0056 0.9998#vn -0.4670 0.1251 0.8753#vn -0.4187 0.2417 0.8753#vn -0.4670 0.1251 0.8753#vn -0.7452 0.4302 0.5096#vn -0.4187 0.2417 0.8753#vn -0.4670 0.1251 0.8753#vn -0.8311 0.2227 0.5096#vn -0.7452 0.4302 0.5096#vn -0.8311 0.2227 0.5096#vn -0.8660 0.5000 0.0000#vn -0.7452 0.4302 0.5096#vn -0.8311 0.2227 0.5096#vn -0.9659 0.2588 0.0000#vn -0.8660 0.5000 0.0000#vn -0.9659 0.2588 0.0000#vn -0.7452 0.4302 -0.5095#vn -0.8660 0.5000 0.0000#vn -0.9659 0.2588 0.0000#vn -0.8311 0.2227 -0.5095#vn -0.7452 0.4302 -0.5095#vn -0.8311 0.2227 -0.5095#vn -0.4187 0.2417 -0.8753#vn -0.7452 0.4302 -0.5095#vn -0.8311 0.2227 -0.5095#vn -0.4670 0.1251 -0.8753#vn -0.4187 0.2417 -0.8753#vn -0.4670 0.1251 -0.8753#vn 0.0187 -0.0108 -0.9998#vn -0.4187 0.2417 -0.8753#vn -0.4670 0.1251 -0.8753#vn 0.0208 -0.0056 -0.9998#vn 0.0187 -0.0108 -0.9998#vn 0.0208 -0.0056 -0.9998#vn 0.4467 -0.2579 -0.8567#vn 0.0187 -0.0108 -0.9998#vn 0.0208 -0.0056 -0.9998#vn 0.4982 -0.1335 -0.8567#vn 0.4467 -0.2579 -0.8567#vn 0.4982 -0.1335 -0.8567#vn 0.7545 -0.4356 -0.4909#vn 0.4467 -0.2579 -0.8567#vn 0.4982 -0.1335 -0.8567#vn 0.8415 -0.2255 -0.4909#vn 0.7545 -0.4356 -0.4909#vn 0.8415 -0.2255 -0.4909#vn 0.8660 -0.5000 -0.0000#vn 0.7545 -0.4356 -0.4909#vn 0.8415 -0.2255 -0.4909#vn 0.9659 -0.2588 -0.0000#vn 0.8660 -0.5000 -0.0000#vn 0.8660 -0.5000 -0.0000#vn 0.6160 -0.6160 0.4909#vn 0.7071 -0.7071 -0.0000#vn 0.8660 -0.5000 -0.0000#vn 0.7545 -0.4356 0.4909#vn 0.6160 -0.6160 0.4909#vn 0.7545 -0.4356 0.4909#vn 0.3647 -0.3647 0.8567#vn 0.6160 -0.6160 0.4909#vn 0.7545 -0.4356 0.4909#vn 0.4467 -0.2579 0.8567#vn 0.3647 -0.3647 0.8567#vn 0.4467 -0.2579 0.8567#vn 0.0152 -0.0152 0.9998#vn 0.3647 -0.3647 0.8567#vn 0.4467 -0.2579 0.8567#vn 0.0187 -0.0108 0.9998#vn 0.0152 -0.0152 0.9998#vn 0.0187 -0.0108 0.9998#vn -0.3419 0.3419 0.8753#vn 0.0152 -0.0152 0.9998#vn 0.0187 -0.0108 0.9998#vn -0.4187 0.2417 0.8753#vn -0.3419 0.3419 0.8753#vn -0.4187 0.2417 0.8753#vn -0.6084 0.6084 0.5096#vn -0.3419 0.3419 0.8753#vn -0.4187 0.2417 0.8753#vn -0.7452 0.4302 0.5096#vn -0.6084 0.6084 0.5096#vn -0.7452 0.4302 0.5096#vn -0.7071 0.7071 0.0000#vn -0.6084 0.6084 0.5096#vn -0.7452 0.4302 0.5096#vn -0.8660 0.5000 0.0000#vn -0.7071 0.7071 0.0000#vn -0.8660 0.5000 0.0000#vn -0.6084 0.6084 -0.5095#vn -0.7071 0.7071 0.0000#vn -0.8660 0.5000 0.0000#vn -0.7452 0.4302 -0.5095#vn -0.6084 0.6084 -0.5095#vn -0.7452 0.4302 -0.5095#vn -0.3419 0.3419 -0.8753#vn -0.6084 0.6084 -0.5095#vn -0.7452 0.4302 -0.5095#vn -0.4187 0.2417 -0.8753#vn -0.3419 0.3419 -0.8753#vn -0.4187 0.2417 -0.8753#vn 0.0152 -0.0152 -0.9998#vn -0.3419 0.3419 -0.8753#vn -0.4187 0.2417 -0.8753#vn 0.0187 -0.0108 -0.9998#vn 0.0152 -0.0152 -0.9998#vn 0.0187 -0.0108 -0.9998#vn 0.3647 -0.3647 -0.8567#vn 0.0152 -0.0152 -0.9998#vn 0.0187 -0.0108 -0.9998#vn 0.4467 -0.2579 -0.8567#vn 0.3647 -0.3647 -0.8567#vn 0.4467 -0.2579 -0.8567#vn 0.6160 -0.6160 -0.4909#vn 0.3647 -0.3647 -0.8567#vn 0.4467 -0.2579 -0.8567#vn 0.7545 -0.4356 -0.4909#vn 0.6160 -0.6160 -0.4909#vn 0.7545 -0.4356 -0.4909#vn 0.7071 -0.7071 -0.0000#vn 0.6160 -0.6160 -0.4909#vn 0.7545 -0.4356 -0.4909#vn 0.8660 -0.5000 -0.0000#vn 0.7071 -0.7071 -0.0000#vn 0.7071 -0.7071 -0.0000#vn 0.4356 -0.7545 0.4909#vn 0.5000 -0.8660 -0.0000#vn 0.7071 -0.7071 -0.0000#vn 0.6160 -0.6160 0.4909#vn 0.4356 -0.7545 0.4909#vn 0.6160 -0.6160 0.4909#vn 0.2579 -0.4467 0.8567#vn 0.4356 -0.7545 0.4909#vn 0.6160 -0.6160 0.4909#vn 0.3647 -0.3647 0.8567#vn 0.2579 -0.4467 0.8567#vn 0.3647 -0.3647 0.8567#vn 0.0108 -0.0187 0.9998#vn 0.2579 -0.4467 0.8567#vn 0.3647 -0.3647 0.8567#vn 0.0152 -0.0152 0.9998#vn 0.0108 -0.0187 0.9998#vn 0.0152 -0.0152 0.9998#vn -0.2417 0.4187 0.8753#vn 0.0108 -0.0187 0.9998#vn 0.0152 -0.0152 0.9998#vn -0.3419 0.3419 0.8753#vn -0.2417 0.4187 0.8753#vn -0.3419 0.3419 0.8753#vn -0.4302 0.7452 0.5096#vn -0.2417 0.4187 0.8753#vn -0.3419 0.3419 0.8753#vn -0.6084 0.6084 0.5096#vn -0.4302 0.7452 0.5096#vn -0.6084 0.6084 0.5096#vn -0.5000 0.8660 0.0000#vn -0.4302 0.7452 0.5096#vn -0.6084 0.6084 0.5096#vn -0.7071 0.7071 0.0000#vn -0.5000 0.8660 0.0000#vn -0.7071 0.7071 0.0000#vn -0.4302 0.7452 -0.5096#vn -0.5000 0.8660 0.0000#vn -0.7071 0.7071 0.0000#vn -0.6084 0.6084 -0.5095#vn -0.4302 0.7452 -0.5096#vn -0.6084 0.6084 -0.5095#vn -0.2417 0.4187 -0.8753#vn -0.4302 0.7452 -0.5096#vn -0.6084 0.6084 -0.5095#vn -0.3419 0.3419 -0.8753#vn -0.2417 0.4187 -0.8753#vn -0.3419 0.3419 -0.8753#vn 0.0108 -0.0187 -0.9998#vn -0.2417 0.4187 -0.8753#vn -0.3419 0.3419 -0.8753#vn 0.0152 -0.0152 -0.9998#vn 0.0108 -0.0187 -0.9998#vn 0.0152 -0.0152 -0.9998#vn 0.2579 -0.4467 -0.8567#vn 0.0108 -0.0187 -0.9998#vn 0.0152 -0.0152 -0.9998#vn 0.3647 -0.3647 -0.8567#vn 0.2579 -0.4467 -0.8567#vn 0.3647 -0.3647 -0.8567#vn 0.4356 -0.7545 -0.4909#vn 0.2579 -0.4467 -0.8567#vn 0.3647 -0.3647 -0.8567#vn 0.6160 -0.6160 -0.4909#vn 0.4356 -0.7545 -0.4909#vn 0.6160 -0.6160 -0.4909#vn 0.5000 -0.8660 -0.0000#vn 0.4356 -0.7545 -0.4909#vn 0.6160 -0.6160 -0.4909#vn 0.7071 -0.7071 -0.0000#vn 0.5000 -0.8660 -0.0000#vn 0.5000 -0.8660 -0.0000#vn 0.2255 -0.8415 0.4909#vn 0.2588 -0.9659 -0.0000#vn 0.5000 -0.8660 -0.0000#vn 0.4356 -0.7545 0.4909#vn 0.2255 -0.8415 0.4909#vn 0.4356 -0.7545 0.4909#vn 0.1335 -0.4982 0.8567#vn 0.2255 -0.8415 0.4909#vn 0.4356 -0.7545 0.4909#vn 0.2579 -0.4467 0.8567#vn 0.1335 -0.4982 0.8567#vn 0.2579 -0.4467 0.8567#vn 0.0056 -0.0208 0.9998#vn 0.1335 -0.4982 0.8567#vn 0.2579 -0.4467 0.8567#vn 0.0108 -0.0187 0.9998#vn 0.0056 -0.0208 0.9998#vn 0.0108 -0.0187 0.9998#vn -0.1251 0.4670 0.8753#vn 0.0056 -0.0208 0.9998#vn 0.0108 -0.0187 0.9998#vn -0.2417 0.4187 0.8753#vn -0.1251 0.4670 0.8753#vn -0.2417 0.4187 0.8753#vn -0.2227 0.8311 0.5096#vn -0.1251 0.4670 0.8753#vn -0.2417 0.4187 0.8753#vn -0.4302 0.7452 0.5096#vn -0.2227 0.8311 0.5096#vn -0.4302 0.7452 0.5096#vn -0.2588 0.9659 0.0000#vn -0.2227 0.8311 0.5096#vn -0.4302 0.7452 0.5096#vn -0.5000 0.8660 0.0000#vn -0.2588 0.9659 0.0000#vn -0.5000 0.8660 0.0000#vn -0.2227 0.8311 -0.5096#vn -0.2588 0.9659 0.0000#vn -0.5000 0.8660 0.0000#vn -0.4302 0.7452 -0.5096#vn -0.2227 0.8311 -0.5096#vn -0.4302 0.7452 -0.5096#vn -0.1251 0.4670 -0.8753#vn -0.2227 0.8311 -0.5096#vn -0.4302 0.7452 -0.5096#vn -0.2417 0.4187 -0.8753#vn -0.1251 0.4670 -0.8753#vn -0.2417 0.4187 -0.8753#vn 0.0056 -0.0208 -0.9998#vn -0.1251 0.4670 -0.8753#vn -0.2417 0.4187 -0.8753#vn 0.0108 -0.0187 -0.9998#vn 0.0056 -0.0208 -0.9998#vn 0.0108 -0.0187 -0.9998#vn 0.1335 -0.4982 -0.8567#vn 0.0056 -0.0208 -0.9998#vn 0.0108 -0.0187 -0.9998#vn 0.2579 -0.4467 -0.8567#vn 0.1335 -0.4982 -0.8567#vn 0.2579 -0.4467 -0.8567#vn 0.2255 -0.8415 -0.4909#vn 0.1335 -0.4982 -0.8567#vn 0.2579 -0.4467 -0.8567#vn 0.4356 -0.7545 -0.4909#vn 0.2255 -0.8415 -0.4909#vn 0.4356 -0.7545 -0.4909#vn 0.2588 -0.9659 -0.0000#vn 0.2255 -0.8415 -0.4909#vn 0.4356 -0.7545 -0.4909#vn 0.5000 -0.8660 -0.0000#vn 0.2588 -0.9659 -0.0000#vn 0.2588 -0.9659 -0.0000#vn 0.0000 -0.8712 0.4909#vn 0.0000 -1.0000 -0.0000#vn 0.2588 -0.9659 -0.0000#vn 0.2255 -0.8415 0.4909#vn 0.0000 -0.8712 0.4909#vn 0.2255 -0.8415 0.4909#vn 0.0000 -0.5158 0.8567#vn 0.0000 -0.8712 0.4909#vn 0.2255 -0.8415 0.4909#vn 0.1335 -0.4982 0.8567#vn 0.0000 -0.5158 0.8567#vn 0.1335 -0.4982 0.8567#vn 0.0000 -0.0216 0.9998#vn 0.0000 -0.5158 0.8567#vn 0.1335 -0.4982 0.8567#vn 0.0056 -0.0208 0.9998#vn 0.0000 -0.0216 0.9998#vn 0.0056 -0.0208 0.9998#vn -0.0000 0.4835 0.8753#vn 0.0000 -0.0216 0.9998#vn 0.0056 -0.0208 0.9998#vn -0.1251 0.4670 0.8753#vn -0.0000 0.4835 0.8753#vn -0.1251 0.4670 0.8753#vn -0.0000 0.8604 0.5096#vn -0.0000 0.4835 0.8753#vn -0.1251 0.4670 0.8753#vn -0.2227 0.8311 0.5096#vn -0.0000 0.8604 0.5096#vn -0.2227 0.8311 0.5096#vn -0.0000 1.0000 0.0000#vn -0.0000 0.8604 0.5096#vn -0.2227 0.8311 0.5096#vn -0.2588 0.9659 0.0000#vn -0.0000 1.0000 0.0000#vn -0.2588 0.9659 0.0000#vn -0.0000 0.8604 -0.5096#vn -0.0000 1.0000 0.0000#vn -0.2588 0.9659 0.0000#vn -0.2227 0.8311 -0.5096#vn -0.0000 0.8604 -0.5096#vn -0.2227 0.8311 -0.5096#vn -0.0000 0.4835 -0.8753#vn -0.0000 0.8604 -0.5096#vn -0.2227 0.8311 -0.5096#vn -0.1251 0.4670 -0.8753#vn -0.0000 0.4835 -0.8753#vn -0.1251 0.4670 -0.8753#vn -0.0000 -0.0216 -0.9998#vn -0.0000 0.4835 -0.8753#vn -0.1251 0.4670 -0.8753#vn 0.0056 -0.0208 -0.9998#vn -0.0000 -0.0216 -0.9998#vn 0.0056 -0.0208 -0.9998#vn 0.0000 -0.5158 -0.8567#vn -0.0000 -0.0216 -0.9998#vn 0.0056 -0.0208 -0.9998#vn 0.1335 -0.4982 -0.8567#vn 0.0000 -0.5158 -0.8567#vn 0.1335 -0.4982 -0.8567#vn 0.0000 -0.8712 -0.4909#vn 0.0000 -0.5158 -0.8567#vn 0.1335 -0.4982 -0.8567#vn 0.2255 -0.8415 -0.4909#vn 0.0000 -0.8712 -0.4909#vn 0.2255 -0.8415 -0.4909#vn 0.0000 -1.0000 -0.0000#vn 0.0000 -0.8712 -0.4909#vn 0.2255 -0.8415 -0.4909#vn 0.2588 -0.9659 -0.0000#vn 0.0000 -1.0000 -0.0000#vn 0.0000 -1.0000 -0.0000#vn -0.2255 -0.8415 0.4909#vn -0.2588 -0.9659 -0.0000#vn 0.0000 -1.0000 -0.0000#vn 0.0000 -0.8712 0.4909#vn -0.2255 -0.8415 0.4909#vn 0.0000 -0.8712 0.4909#vn -0.1335 -0.4982 0.8567#vn -0.2255 -0.8415 0.4909#vn 0.0000 -0.8712 0.4909#vn 0.0000 -0.5158 0.8567#vn -0.1335 -0.4982 0.8567#vn 0.0000 -0.5158 0.8567#vn -0.0056 -0.0208 0.9998#vn -0.1335 -0.4982 0.8567#vn 0.0000 -0.5158 0.8567#vn 0.0000 -0.0216 0.9998#vn -0.0056 -0.0208 0.9998#vn 0.0000 -0.0216 0.9998#vn 0.1251 0.4670 0.8753#vn -0.0056 -0.0208 0.9998#vn 0.0000 -0.0216 0.9998#vn -0.0000 0.4835 0.8753#vn 0.1251 0.4670 0.8753#vn -0.0000 0.4835 0.8753#vn 0.2227 0.8311 0.5096#vn 0.1251 0.4670 0.8753#vn -0.0000 0.4835 0.8753#vn -0.0000 0.8604 0.5096#vn 0.2227 0.8311 0.5096#vn -0.0000 0.8604 0.5096#vn 0.2588 0.9659 0.0000#vn 0.2227 0.8311 0.5096#vn -0.0000 0.8604 0.5096#vn -0.0000 1.0000 0.0000#vn 0.2588 0.9659 0.0000#vn -0.0000 1.0000 0.0000#vn 0.2227 0.8311 -0.5096#vn 0.2588 0.9659 0.0000#vn -0.0000 1.0000 0.0000#vn -0.0000 0.8604 -0.5096#vn 0.2227 0.8311 -0.5096#vn -0.0000 0.8604 -0.5096#vn 0.1251 0.4670 -0.8753#vn 0.2227 0.8311 -0.5096#vn -0.0000 0.8604 -0.5096#vn -0.0000 0.4835 -0.8753#vn 0.1251 0.4670 -0.8753#vn -0.0000 0.4835 -0.8753#vn -0.0056 -0.0208 -0.9998#vn 0.1251 0.4670 -0.8753#vn -0.0000 0.4835 -0.8753#vn -0.0000 -0.0216 -0.9998#vn -0.0056 -0.0208 -0.9998#vn -0.0000 -0.0216 -0.9998#vn -0.1335 -0.4982 -0.8567#vn -0.0056 -0.0208 -0.9998#vn -0.0000 -0.0216 -0.9998#vn 0.0000 -0.5158 -0.8567#vn -0.1335 -0.4982 -0.8567#vn 0.0000 -0.5158 -0.8567#vn -0.2255 -0.8415 -0.4909#vn -0.1335 -0.4982 -0.8567#vn 0.0000 -0.5158 -0.8567#vn 0.0000 -0.8712 -0.4909#vn -0.2255 -0.8415 -0.4909#vn 0.0000 -0.8712 -0.4909#vn -0.2588 -0.9659 -0.0000#vn -0.2255 -0.8415 -0.4909#vn 0.0000 -0.8712 -0.4909#vn 0.0000 -1.0000 -0.0000#vn -0.2588 -0.9659 -0.0000#vn -0.2588 -0.9659 -0.0000#vn -0.4356 -0.7545 0.4909#vn -0.5000 -0.8660 -0.0000#vn -0.2588 -0.9659 -0.0000#vn -0.2255 -0.8415 0.4909#vn -0.4356 -0.7545 0.4909#vn -0.2255 -0.8415 0.4909#vn -0.2579 -0.4467 0.8567#vn -0.4356 -0.7545 0.4909#vn -0.2255 -0.8415 0.4909#vn -0.1335 -0.4982 0.8567#vn -0.2579 -0.4467 0.8567#vn -0.1335 -0.4982 0.8567#vn -0.0108 -0.0187 0.9998#vn -0.2579 -0.4467 0.8567#vn -0.1335 -0.4982 0.8567#vn -0.0056 -0.0208 0.9998#vn -0.0108 -0.0187 0.9998#vn -0.0056 -0.0208 0.9998#vn 0.2417 0.4187 0.8753#vn -0.0108 -0.0187 0.9998#vn -0.0056 -0.0208 0.9998#vn 0.1251 0.4670 0.8753#vn 0.2417 0.4187 0.8753#vn 0.1251 0.4670 0.8753#vn 0.4302 0.7452 0.5096#vn 0.2417 0.4187 0.8753#vn 0.1251 0.4670 0.8753#vn 0.2227 0.8311 0.5096#vn 0.4302 0.7452 0.5096#vn 0.2227 0.8311 0.5096#vn 0.5000 0.8660 0.0000#vn 0.4302 0.7452 0.5096#vn 0.2227 0.8311 0.5096#vn 0.2588 0.9659 0.0000#vn 0.5000 0.8660 0.0000#vn 0.2588 0.9659 0.0000#vn 0.4302 0.7452 -0.5096#vn 0.5000 0.8660 0.0000#vn 0.2588 0.9659 0.0000#vn 0.2227 0.8311 -0.5096#vn 0.4302 0.7452 -0.5096#vn 0.2227 0.8311 -0.5096#vn 0.2417 0.4187 -0.8753#vn 0.4302 0.7452 -0.5096#vn 0.2227 0.8311 -0.5096#vn 0.1251 0.4670 -0.8753#vn 0.2417 0.4187 -0.8753#vn 0.1251 0.4670 -0.8753#vn -0.0108 -0.0187 -0.9998#vn 0.2417 0.4187 -0.8753#vn 0.1251 0.4670 -0.8753#vn -0.0056 -0.0208 -0.9998#vn -0.0108 -0.0187 -0.9998#vn -0.0056 -0.0208 -0.9998#vn -0.2579 -0.4467 -0.8567#vn -0.0108 -0.0187 -0.9998#vn -0.0056 -0.0208 -0.9998#vn -0.1335 -0.4982 -0.8567#vn -0.2579 -0.4467 -0.8567#vn -0.1335 -0.4982 -0.8567#vn -0.4356 -0.7545 -0.4909#vn -0.2579 -0.4467 -0.8567#vn -0.1335 -0.4982 -0.8567#vn -0.2255 -0.8415 -0.4909#vn -0.4356 -0.7545 -0.4909#vn -0.2255 -0.8415 -0.4909#vn -0.5000 -0.8660 -0.0000#vn -0.4356 -0.7545 -0.4909#vn -0.2255 -0.8415 -0.4909#vn -0.2588 -0.9659 -0.0000#vn -0.5000 -0.8660 -0.0000#vn -0.5000 -0.8660 -0.0000#vn -0.6160 -0.6160 0.4909#vn -0.7071 -0.7071 -0.0000#vn -0.5000 -0.8660 -0.0000#vn -0.4356 -0.7545 0.4909#vn -0.6160 -0.6160 0.4909#vn -0.4356 -0.7545 0.4909#vn -0.3647 -0.3647 0.8567#vn -0.6160 -0.6160 0.4909#vn -0.4356 -0.7545 0.4909#vn -0.2579 -0.4467 0.8567#vn -0.3647 -0.3647 0.8567#vn -0.2579 -0.4467 0.8567#vn -0.0152 -0.0152 0.9998#vn -0.3647 -0.3647 0.8567#vn -0.2579 -0.4467 0.8567#vn -0.0108 -0.0187 0.9998#vn -0.0152 -0.0152 0.9998#vn -0.0108 -0.0187 0.9998#vn 0.3419 0.3419 0.8753#vn -0.0152 -0.0152 0.9998#vn -0.0108 -0.0187 0.9998#vn 0.2417 0.4187 0.8753#vn 0.3419 0.3419 0.8753#vn 0.2417 0.4187 0.8753#vn 0.6084 0.6084 0.5096#vn 0.3419 0.3419 0.8753#vn 0.2417 0.4187 0.8753#vn 0.4302 0.7452 0.5096#vn 0.6084 0.6084 0.5096#vn 0.4302 0.7452 0.5096#vn 0.7071 0.7071 0.0000#vn 0.6084 0.6084 0.5096#vn 0.4302 0.7452 0.5096#vn 0.5000 0.8660 0.0000#vn 0.7071 0.7071 0.0000#vn 0.5000 0.8660 0.0000#vn 0.6084 0.6084 -0.5095#vn 0.7071 0.7071 0.0000#vn 0.5000 0.8660 0.0000#vn 0.4302 0.7452 -0.5096#vn 0.6084 0.6084 -0.5095#vn 0.4302 0.7452 -0.5096#vn 0.3419 0.3419 -0.8753#vn 0.6084 0.6084 -0.5095#vn 0.4302 0.7452 -0.5096#vn 0.2417 0.4187 -0.8753#vn 0.3419 0.3419 -0.8753#vn 0.2417 0.4187 -0.8753#vn -0.0152 -0.0152 -0.9998#vn 0.3419 0.3419 -0.8753#vn 0.2417 0.4187 -0.8753#vn -0.0108 -0.0187 -0.9998#vn -0.0152 -0.0152 -0.9998#vn -0.0108 -0.0187 -0.9998#vn -0.3647 -0.3647 -0.8567#vn -0.0152 -0.0152 -0.9998#vn -0.0108 -0.0187 -0.9998#vn -0.2579 -0.4467 -0.8567#vn -0.3647 -0.3647 -0.8567#vn -0.2579 -0.4467 -0.8567#vn -0.6160 -0.6160 -0.4909#vn -0.3647 -0.3647 -0.8567#vn -0.2579 -0.4467 -0.8567#vn -0.4356 -0.7545 -0.4909#vn -0.6160 -0.6160 -0.4909#vn -0.4356 -0.7545 -0.4909#vn -0.7071 -0.7071 -0.0000#vn -0.6160 -0.6160 -0.4909#vn -0.4356 -0.7545 -0.4909#vn -0.5000 -0.8660 -0.0000#vn -0.7071 -0.7071 -0.0000#vn -0.7071 -0.7071 -0.0000#vn -0.7545 -0.4356 0.4909#vn -0.8660 -0.5000 -0.0000#vn -0.7071 -0.7071 -0.0000#vn -0.6160 -0.6160 0.4909#vn -0.7545 -0.4356 0.4909#vn -0.6160 -0.6160 0.4909#vn -0.4467 -0.2579 0.8567#vn -0.7545 -0.4356 0.4909#vn -0.6160 -0.6160 0.4909#vn -0.3647 -0.3647 0.8567#vn -0.4467 -0.2579 0.8567#vn -0.3647 -0.3647 0.8567#vn -0.0187 -0.0108 0.9998#vn -0.4467 -0.2579 0.8567#vn -0.3647 -0.3647 0.8567#vn -0.0152 -0.0152 0.9998#vn -0.0187 -0.0108 0.9998#vn -0.0152 -0.0152 0.9998#vn 0.4187 0.2417 0.8753#vn -0.0187 -0.0108 0.9998#vn -0.0152 -0.0152 0.9998#vn 0.3419 0.3419 0.8753#vn 0.4187 0.2417 0.8753#vn 0.3419 0.3419 0.8753#vn 0.7452 0.4302 0.5096#vn 0.4187 0.2417 0.8753#vn 0.3419 0.3419 0.8753#vn 0.6084 0.6084 0.5096#vn 0.7452 0.4302 0.5096#vn 0.6084 0.6084 0.5096#vn 0.8660 0.5000 0.0000#vn 0.7452 0.4302 0.5096#vn 0.6084 0.6084 0.5096#vn 0.7071 0.7071 0.0000#vn 0.8660 0.5000 0.0000#vn 0.7071 0.7071 0.0000#vn 0.7452 0.4302 -0.5096#vn 0.8660 0.5000 0.0000#vn 0.7071 0.7071 0.0000#vn 0.6084 0.6084 -0.5095#vn 0.7452 0.4302 -0.5096#vn 0.6084 0.6084 -0.5095#vn 0.4187 0.2417 -0.8753#vn 0.7452 0.4302 -0.5096#vn 0.6084 0.6084 -0.5095#vn 0.3419 0.3419 -0.8753#vn 0.4187 0.2417 -0.8753#vn 0.3419 0.3419 -0.8753#vn -0.0187 -0.0108 -0.9998#vn 0.4187 0.2417 -0.8753#vn 0.3419 0.3419 -0.8753#vn -0.0152 -0.0152 -0.9998#vn -0.0187 -0.0108 -0.9998#vn -0.0152 -0.0152 -0.9998#vn -0.4467 -0.2579 -0.8567#vn -0.0187 -0.0108 -0.9998#vn -0.0152 -0.0152 -0.9998#vn -0.3647 -0.3647 -0.8567#vn -0.4467 -0.2579 -0.8567#vn -0.3647 -0.3647 -0.8567#vn -0.7545 -0.4356 -0.4909#vn -0.4467 -0.2579 -0.8567#vn -0.3647 -0.3647 -0.8567#vn -0.6160 -0.6160 -0.4909#vn -0.7545 -0.4356 -0.4909#vn -0.6160 -0.6160 -0.4909#vn -0.8660 -0.5000 -0.0000#vn -0.7545 -0.4356 -0.4909#vn -0.6160 -0.6160 -0.4909#vn -0.7071 -0.7071 -0.0000#vn -0.8660 -0.5000 -0.0000#vn -0.8660 -0.5000 -0.0000#vn -0.8415 -0.2255 0.4909#vn -0.9659 -0.2588 -0.0000#vn -0.8660 -0.5000 -0.0000#vn -0.7545 -0.4356 0.4909#vn -0.8415 -0.2255 0.4909#vn -0.7545 -0.4356 0.4909#vn -0.4982 -0.1335 0.8567#vn -0.8415 -0.2255 0.4909#vn -0.7545 -0.4356 0.4909#vn -0.4467 -0.2579 0.8567#vn -0.4982 -0.1335 0.8567#vn -0.4467 -0.2579 0.8567#vn -0.0208 -0.0056 0.9998#vn -0.4982 -0.1335 0.8567#vn -0.4467 -0.2579 0.8567#vn -0.0187 -0.0108 0.9998#vn -0.0208 -0.0056 0.9998#vn -0.0187 -0.0108 0.9998#vn 0.4670 0.1251 0.8753#vn -0.0208 -0.0056 0.9998#vn -0.0187 -0.0108 0.9998#vn 0.4187 0.2417 0.8753#vn 0.4670 0.1251 0.8753#vn 0.4187 0.2417 0.8753#vn 0.8311 0.2227 0.5096#vn 0.4670 0.1251 0.8753#vn 0.4187 0.2417 0.8753#vn 0.7452 0.4302 0.5096#vn 0.8311 0.2227 0.5096#vn 0.7452 0.4302 0.5096#vn 0.9659 0.2588 0.0000#vn 0.8311 0.2227 0.5096#vn 0.7452 0.4302 0.5096#vn 0.8660 0.5000 0.0000#vn 0.9659 0.2588 0.0000#vn 0.8660 0.5000 0.0000#vn 0.8311 0.2227 -0.5096#vn 0.9659 0.2588 0.0000#vn 0.8660 0.5000 0.0000#vn 0.7452 0.4302 -0.5096#vn 0.8311 0.2227 -0.5096#vn 0.7452 0.4302 -0.5096#vn 0.4670 0.1251 -0.8753#vn 0.8311 0.2227 -0.5096#vn 0.7452 0.4302 -0.5096#vn 0.4187 0.2417 -0.8753#vn 0.4670 0.1251 -0.8753#vn 0.4187 0.2417 -0.8753#vn -0.0208 -0.0056 -0.9998#vn 0.4670 0.1251 -0.8753#vn 0.4187 0.2417 -0.8753#vn -0.0187 -0.0108 -0.9998#vn -0.0208 -0.0056 -0.9998#vn -0.0187 -0.0108 -0.9998#vn -0.4982 -0.1335 -0.8567#vn -0.0208 -0.0056 -0.9998#vn -0.0187 -0.0108 -0.9998#vn -0.4467 -0.2579 -0.8567#vn -0.4982 -0.1335 -0.8567#vn -0.4467 -0.2579 -0.8567#vn -0.8415 -0.2255 -0.4909#vn -0.4982 -0.1335 -0.8567#vn -0.4467 -0.2579 -0.8567#vn -0.7545 -0.4356 -0.4909#vn -0.8415 -0.2255 -0.4909#vn -0.7545 -0.4356 -0.4909#vn -0.9659 -0.2588 -0.0000#vn -0.8415 -0.2255 -0.4909#vn -0.7545 -0.4356 -0.4909#vn -0.8660 -0.5000 -0.0000#vn -0.9659 -0.2588 -0.0000#vn -0.9659 -0.2588 -0.0000#vn -0.8712 -0.0000 0.4909#vn -1.0000 -0.0000 -0.0000#vn -0.9659 -0.2588 -0.0000#vn -0.8415 -0.2255 0.4909#vn -0.8712 -0.0000 0.4909#vn -0.8415 -0.2255 0.4909#vn -0.5158 -0.0000 0.8567#vn -0.8712 -0.0000 0.4909#vn -0.8415 -0.2255 0.4909#vn -0.4982 -0.1335 0.8567#vn -0.5158 -0.0000 0.8567#vn -0.4982 -0.1335 0.8567#vn -0.0216 -0.0000 0.9998#vn -0.5158 -0.0000 0.8567#vn -0.4982 -0.1335 0.8567#vn -0.0208 -0.0056 0.9998#vn -0.0216 -0.0000 0.9998#vn -0.0208 -0.0056 0.9998#vn 0.4835 0.0000 0.8753#vn -0.0216 -0.0000 0.9998#vn -0.0208 -0.0056 0.9998#vn 0.4670 0.1251 0.8753#vn 0.4835 0.0000 0.8753#vn 0.4670 0.1251 0.8753#vn 0.8604 0.0000 0.5096#vn 0.4835 0.0000 0.8753#vn 0.4670 0.1251 0.8753#vn 0.8311 0.2227 0.5096#vn 0.8604 0.0000 0.5096#vn 0.8311 0.2227 0.5096#vn 1.0000 0.0000 0.0000#vn 0.8604 0.0000 0.5096#vn 0.8311 0.2227 0.5096#vn 0.9659 0.2588 0.0000#vn 1.0000 0.0000 0.0000#vn 0.9659 0.2588 0.0000#vn 0.8604 0.0000 -0.5096#vn 1.0000 0.0000 0.0000#vn 0.9659 0.2588 0.0000#vn 0.8311 0.2227 -0.5096#vn 0.8604 0.0000 -0.5096#vn 0.8311 0.2227 -0.5096#vn 0.4835 0.0000 -0.8753#vn 0.8604 0.0000 -0.5096#vn 0.8311 0.2227 -0.5096#vn 0.4670 0.1251 -0.8753#vn 0.4835 0.0000 -0.8753#vn 0.4670 0.1251 -0.8753#vn -0.0216 -0.0000 -0.9998#vn 0.4835 0.0000 -0.8753#vn 0.4670 0.1251 -0.8753#vn -0.0208 -0.0056 -0.9998#vn -0.0216 -0.0000 -0.9998#vn -0.0208 -0.0056 -0.9998#vn -0.5158 -0.0000 -0.8567#vn -0.0216 -0.0000 -0.9998#vn -0.0208 -0.0056 -0.9998#vn -0.4982 -0.1335 -0.8567#vn -0.5158 -0.0000 -0.8567#vn -0.4982 -0.1335 -0.8567#vn -0.8712 -0.0000 -0.4909#vn -0.5158 -0.0000 -0.8567#vn -0.4982 -0.1335 -0.8567#vn -0.8415 -0.2255 -0.4909#vn -0.8712 -0.0000 -0.4909#vn -0.8415 -0.2255 -0.4909#vn -1.0000 -0.0000 -0.0000#vn -0.8712 -0.0000 -0.4909#vn -0.8415 -0.2255 -0.4909#vn -0.9659 -0.2588 -0.0000#vn -1.0000 -0.0000 -0.0000#vn -1.0000 -0.0000 -0.0000#vn -0.8415 0.2255 0.4909#vn -0.9659 0.2588 -0.0000#vn -1.0000 -0.0000 -0.0000#vn -0.8712 -0.0000 0.4909#vn -0.8415 0.2255 0.4909#vn -0.8712 -0.0000 0.4909#vn -0.4982 0.1335 0.8567#vn -0.8415 0.2255 0.4909#vn -0.8712 -0.0000 0.4909#vn -0.5158 -0.0000 0.8567#vn -0.4982 0.1335 0.8567#vn -0.5158 -0.0000 0.8567#vn -0.0208 0.0056 0.9998#vn -0.4982 0.1335 0.8567#vn -0.5158 -0.0000 0.8567#vn -0.0216 -0.0000 0.9998#vn -0.0208 0.0056 0.9998#vn -0.0216 -0.0000 0.9998#vn 0.4670 -0.1251 0.8753#vn -0.0208 0.0056 0.9998#vn -0.0216 -0.0000 0.9998#vn 0.4835 0.0000 0.8753#vn 0.4670 -0.1251 0.8753#vn 0.4835 0.0000 0.8753#vn 0.8311 -0.2227 0.5096#vn 0.4670 -0.1251 0.8753#vn 0.4835 0.0000 0.8753#vn 0.8604 0.0000 0.5096#vn 0.8311 -0.2227 0.5096#vn 0.8604 0.0000 0.5096#vn 0.9659 -0.2588 0.0000#vn 0.8311 -0.2227 0.5096#vn 0.8604 0.0000 0.5096#vn 1.0000 0.0000 0.0000#vn 0.9659 -0.2588 0.0000#vn 1.0000 0.0000 0.0000#vn 0.8311 -0.2227 -0.5096#vn 0.9659 -0.2588 0.0000#vn 1.0000 0.0000 0.0000#vn 0.8604 0.0000 -0.5096#vn 0.8311 -0.2227 -0.5096#vn 0.8604 0.0000 -0.5096#vn 0.4670 -0.1251 -0.8753#vn 0.8311 -0.2227 -0.5096#vn 0.8604 0.0000 -0.5096#vn 0.4835 0.0000 -0.8753#vn 0.4670 -0.1251 -0.8753#vn 0.4835 0.0000 -0.8753#vn -0.0208 0.0056 -0.9998#vn 0.4670 -0.1251 -0.8753#vn 0.4835 0.0000 -0.8753#vn -0.0216 -0.0000 -0.9998#vn -0.0208 0.0056 -0.9998#vn -0.0216 -0.0000 -0.9998#vn -0.4982 0.1335 -0.8567#vn -0.0208 0.0056 -0.9998#vn -0.0216 -0.0000 -0.9998#vn -0.5158 -0.0000 -0.8567#vn -0.4982 0.1335 -0.8567#vn -0.5158 -0.0000 -0.8567#vn -0.8415 0.2255 -0.4909#vn -0.4982 0.1335 -0.8567#vn -0.5158 -0.0000 -0.8567#vn -0.8712 -0.0000 -0.4909#vn -0.8415 0.2255 -0.4909#vn -0.8712 -0.0000 -0.4909#vn -0.9659 0.2588 -0.0000#vn -0.8415 0.2255 -0.4909#vn -0.8712 -0.0000 -0.4909#vn -1.0000 -0.0000 -0.0000#vn -0.9659 0.2588 -0.0000#vn -0.9659 0.2588 -0.0000#vn -0.7545 0.4356 0.4909#vn -0.8660 0.5000 -0.0000#vn -0.9659 0.2588 -0.0000#vn -0.8415 0.2255 0.4909#vn -0.7545 0.4356 0.4909#vn -0.8415 0.2255 0.4909#vn -0.4467 0.2579 0.8567#vn -0.7545 0.4356 0.4909#vn -0.8415 0.2255 0.4909#vn -0.4982 0.1335 0.8567#vn -0.4467 0.2579 0.8567#vn -0.4982 0.1335 0.8567#vn -0.0187 0.0108 0.9998#vn -0.4467 0.2579 0.8567#vn -0.4982 0.1335 0.8567#vn -0.0208 0.0056 0.9998#vn -0.0187 0.0108 0.9998#vn -0.0208 0.0056 0.9998#vn 0.4187 -0.2417 0.8753#vn -0.0187 0.0108 0.9998#vn -0.0208 0.0056 0.9998#vn 0.4670 -0.1251 0.8753#vn 0.4187 -0.2417 0.8753#vn 0.4670 -0.1251 0.8753#vn 0.7452 -0.4302 0.5096#vn 0.4187 -0.2417 0.8753#vn 0.4670 -0.1251 0.8753#vn 0.8311 -0.2227 0.5096#vn 0.7452 -0.4302 0.5096#vn 0.8311 -0.2227 0.5096#vn 0.8660 -0.5000 0.0000#vn 0.7452 -0.4302 0.5096#vn 0.8311 -0.2227 0.5096#vn 0.9659 -0.2588 0.0000#vn 0.8660 -0.5000 0.0000#vn 0.9659 -0.2588 0.0000#vn 0.7452 -0.4302 -0.5096#vn 0.8660 -0.5000 0.0000#vn 0.9659 -0.2588 0.0000#vn 0.8311 -0.2227 -0.5096#vn 0.7452 -0.4302 -0.5096#vn 0.8311 -0.2227 -0.5096#vn 0.4187 -0.2417 -0.8753#vn 0.7452 -0.4302 -0.5096#vn 0.8311 -0.2227 -0.5096#vn 0.4670 -0.1251 -0.8753#vn 0.4187 -0.2417 -0.8753#vn 0.4670 -0.1251 -0.8753#vn -0.0187 0.0108 -0.9998#vn 0.4187 -0.2417 -0.8753#vn 0.4670 -0.1251 -0.8753#vn -0.0208 0.0056 -0.9998#vn -0.0187 0.0108 -0.9998#vn -0.0208 0.0056 -0.9998#vn -0.4467 0.2579 -0.8567#vn -0.0187 0.0108 -0.9998#vn -0.0208 0.0056 -0.9998#vn -0.4982 0.1335 -0.8567#vn -0.4467 0.2579 -0.8567#vn -0.4982 0.1335 -0.8567#vn -0.7545 0.4356 -0.4909#vn -0.4467 0.2579 -0.8567#vn -0.4982 0.1335 -0.8567#vn -0.8415 0.2255 -0.4909#vn -0.7545 0.4356 -0.4909#vn -0.8415 0.2255 -0.4909#vn -0.8660 0.5000 -0.0000#vn -0.7545 0.4356 -0.4909#vn -0.8415 0.2255 -0.4909#vn -0.9659 0.2588 -0.0000#vn -0.8660 0.5000 -0.0000#vn -0.8660 0.5000 -0.0000#vn -0.6160 0.6160 0.4909#vn -0.7071 0.7071 -0.0000#vn -0.8660 0.5000 -0.0000#vn -0.7545 0.4356 0.4909#vn -0.6160 0.6160 0.4909#vn -0.7545 0.4356 0.4909#vn -0.3647 0.3647 0.8567#vn -0.6160 0.6160 0.4909#vn -0.7545 0.4356 0.4909#vn -0.4467 0.2579 0.8567#vn -0.3647 0.3647 0.8567#vn -0.4467 0.2579 0.8567#vn -0.0152 0.0152 0.9998#vn -0.3647 0.3647 0.8567#vn -0.4467 0.2579 0.8567#vn -0.0187 0.0108 0.9998#vn -0.0152 0.0152 0.9998#vn -0.0187 0.0108 0.9998#vn 0.3419 -0.3419 0.8753#vn -0.0152 0.0152 0.9998#vn -0.0187 0.0108 0.9998#vn 0.4187 -0.2417 0.8753#vn 0.3419 -0.3419 0.8753#vn 0.4187 -0.2417 0.8753#vn 0.6084 -0.6084 0.5096#vn 0.3419 -0.3419 0.8753#vn 0.4187 -0.2417 0.8753#vn 0.7452 -0.4302 0.5096#vn 0.6084 -0.6084 0.5096#vn 0.7452 -0.4302 0.5096#vn 0.7071 -0.7071 0.0000#vn 0.6084 -0.6084 0.5096#vn 0.7452 -0.4302 0.5096#vn 0.8660 -0.5000 0.0000#vn 0.7071 -0.7071 0.0000#vn 0.8660 -0.5000 0.0000#vn 0.6084 -0.6084 -0.5096#vn 0.7071 -0.7071 0.0000#vn 0.8660 -0.5000 0.0000#vn 0.7452 -0.4302 -0.5096#vn 0.6084 -0.6084 -0.5096#vn 0.7452 -0.4302 -0.5096#vn 0.3419 -0.3419 -0.8753#vn 0.6084 -0.6084 -0.5096#vn 0.7452 -0.4302 -0.5096#vn 0.4187 -0.2417 -0.8753#vn 0.3419 -0.3419 -0.8753#vn 0.4187 -0.2417 -0.8753#vn -0.0152 0.0152 -0.9998#vn 0.3419 -0.3419 -0.8753#vn 0.4187 -0.2417 -0.8753#vn -0.0187 0.0108 -0.9998#vn -0.0152 0.0152 -0.9998#vn -0.0187 0.0108 -0.9998#vn -0.3647 0.3647 -0.8567#vn -0.0152 0.0152 -0.9998#vn -0.0187 0.0108 -0.9998#vn -0.4467 0.2579 -0.8567#vn -0.3647 0.3647 -0.8567#vn -0.4467 0.2579 -0.8567#vn -0.6160 0.6160 -0.4909#vn -0.3647 0.3647 -0.8567#vn -0.4467 0.2579 -0.8567#vn -0.7545 0.4356 -0.4909#vn -0.6160 0.6160 -0.4909#vn -0.7545 0.4356 -0.4909#vn -0.7071 0.7071 -0.0000#vn -0.6160 0.6160 -0.4909#vn -0.7545 0.4356 -0.4909#vn -0.8660 0.5000 -0.0000#vn -0.7071 0.7071 -0.0000#vn -0.7071 0.7071 -0.0000#vn -0.4356 0.7545 0.4909#vn -0.5000 0.8660 -0.0000#vn -0.7071 0.7071 -0.0000#vn -0.6160 0.6160 0.4909#vn -0.4356 0.7545 0.4909#vn -0.6160 0.6160 0.4909#vn -0.2579 0.4467 0.8567#vn -0.4356 0.7545 0.4909#vn -0.6160 0.6160 0.4909#vn -0.3647 0.3647 0.8567#vn -0.2579 0.4467 0.8567#vn -0.3647 0.3647 0.8567#vn -0.0108 0.0187 0.9998#vn -0.2579 0.4467 0.8567#vn -0.3647 0.3647 0.8567#vn -0.0152 0.0152 0.9998#vn -0.0108 0.0187 0.9998#vn -0.0152 0.0152 0.9998#vn 0.2417 -0.4187 0.8753#vn -0.0108 0.0187 0.9998#vn -0.0152 0.0152 0.9998#vn 0.3419 -0.3419 0.8753#vn 0.2417 -0.4187 0.8753#vn 0.3419 -0.3419 0.8753#vn 0.4302 -0.7452 0.5096#vn 0.2417 -0.4187 0.8753#vn 0.3419 -0.3419 0.8753#vn 0.6084 -0.6084 0.5096#vn 0.4302 -0.7452 0.5096#vn 0.6084 -0.6084 0.5096#vn 0.5000 -0.8660 0.0000#vn 0.4302 -0.7452 0.5096#vn 0.6084 -0.6084 0.5096#vn 0.7071 -0.7071 0.0000#vn 0.5000 -0.8660 0.0000#vn 0.7071 -0.7071 0.0000#vn 0.4302 -0.7452 -0.5096#vn 0.5000 -0.8660 0.0000#vn 0.7071 -0.7071 0.0000#vn 0.6084 -0.6084 -0.5096#vn 0.4302 -0.7452 -0.5096#vn 0.6084 -0.6084 -0.5096#vn 0.2417 -0.4187 -0.8753#vn 0.4302 -0.7452 -0.5096#vn 0.6084 -0.6084 -0.5096#vn 0.3419 -0.3419 -0.8753#vn 0.2417 -0.4187 -0.8753#vn 0.3419 -0.3419 -0.8753#vn -0.0108 0.0187 -0.9998#vn 0.2417 -0.4187 -0.8753#vn 0.3419 -0.3419 -0.8753#vn -0.0152 0.0152 -0.9998#vn -0.0108 0.0187 -0.9998#vn -0.0152 0.0152 -0.9998#vn -0.2579 0.4467 -0.8567#vn -0.0108 0.0187 -0.9998#vn -0.0152 0.0152 -0.9998#vn -0.3647 0.3647 -0.8567#vn -0.2579 0.4467 -0.8567#vn -0.3647 0.3647 -0.8567#vn -0.4356 0.7545 -0.4909#vn -0.2579 0.4467 -0.8567#vn -0.3647 0.3647 -0.8567#vn -0.6160 0.6160 -0.4909#vn -0.4356 0.7545 -0.4909#vn -0.6160 0.6160 -0.4909#vn -0.5000 0.8660 -0.0000#vn -0.4356 0.7545 -0.4909#vn -0.6160 0.6160 -0.4909#vn -0.7071 0.7071 -0.0000#vn -0.5000 0.8660 -0.0000#vn -0.5000 0.8660 -0.0000#vn -0.2255 0.8415 0.4909#vn -0.2588 0.9659 -0.0000#vn -0.5000 0.8660 -0.0000#vn -0.4356 0.7545 0.4909#vn -0.2255 0.8415 0.4909#vn -0.4356 0.7545 0.4909#vn -0.1335 0.4982 0.8567#vn -0.2255 0.8415 0.4909#vn -0.4356 0.7545 0.4909#vn -0.2579 0.4467 0.8567#vn -0.1335 0.4982 0.8567#vn -0.2579 0.4467 0.8567#vn -0.0056 0.0208 0.9998#vn -0.1335 0.4982 0.8567#vn -0.2579 0.4467 0.8567#vn -0.0108 0.0187 0.9998#vn -0.0056 0.0208 0.9998#vn -0.0108 0.0187 0.9998#vn 0.1251 -0.4670 0.8753#vn -0.0056 0.0208 0.9998#vn -0.0108 0.0187 0.9998#vn 0.2417 -0.4187 0.8753#vn 0.1251 -0.4670 0.8753#vn 0.2417 -0.4187 0.8753#vn 0.2227 -0.8311 0.5096#vn 0.1251 -0.4670 0.8753#vn 0.2417 -0.4187 0.8753#vn 0.4302 -0.7452 0.5096#vn 0.2227 -0.8311 0.5096#vn 0.4302 -0.7452 0.5096#vn 0.2588 -0.9659 0.0000#vn 0.2227 -0.8311 0.5096#vn 0.4302 -0.7452 0.5096#vn 0.5000 -0.8660 0.0000#vn 0.2588 -0.9659 0.0000#vn 0.5000 -0.8660 0.0000#vn 0.2227 -0.8311 -0.5096#vn 0.2588 -0.9659 0.0000#vn 0.5000 -0.8660 0.0000#vn 0.4302 -0.7452 -0.5096#vn 0.2227 -0.8311 -0.5096#vn 0.4302 -0.7452 -0.5096#vn 0.1251 -0.4670 -0.8753#vn 0.2227 -0.8311 -0.5096#vn 0.4302 -0.7452 -0.5096#vn 0.2417 -0.4187 -0.8753#vn 0.1251 -0.4670 -0.8753#vn 0.2417 -0.4187 -0.8753#vn -0.0056 0.0208 -0.9998#vn 0.1251 -0.4670 -0.8753#vn 0.2417 -0.4187 -0.8753#vn -0.0108 0.0187 -0.9998#vn -0.0056 0.0208 -0.9998#vn -0.0108 0.0187 -0.9998#vn -0.1335 0.4982 -0.8567#vn -0.0056 0.0208 -0.9998#vn -0.0108 0.0187 -0.9998#vn -0.2579 0.4467 -0.8567#vn -0.1335 0.4982 -0.8567#vn -0.2579 0.4467 -0.8567#vn -0.2255 0.8415 -0.4909#vn -0.1335 0.4982 -0.8567#vn -0.2579 0.4467 -0.8567#vn -0.4356 0.7545 -0.4909#vn -0.2255 0.8415 -0.4909#vn -0.4356 0.7545 -0.4909#vn -0.2588 0.9659 -0.0000#vn -0.2255 0.8415 -0.4909#vn -0.4356 0.7545 -0.4909#vn -0.5000 0.8660 -0.0000#vn -0.2588 0.9659 -0.0000#vn -0.2588 0.9659 -0.0000#vn -0.0000 0.8712 0.4909#vn -0.0000 1.0000 -0.0000#vn -0.2588 0.9659 -0.0000#vn -0.2255 0.8415 0.4909#vn -0.0000 0.8712 0.4909#vn -0.2255 0.8415 0.4909#vn -0.0000 0.5158 0.8567#vn -0.0000 0.8712 0.4909#vn -0.2255 0.8415 0.4909#vn -0.1335 0.4982 0.8567#vn -0.0000 0.5158 0.8567#vn -0.1335 0.4982 0.8567#vn -0.0000 0.0216 0.9998#vn -0.0000 0.5158 0.8567#vn -0.1335 0.4982 0.8567#vn -0.0056 0.0208 0.9998#vn -0.0000 0.0216 0.9998#vn -0.0056 0.0208 0.9998#vn 0.0000 -0.4835 0.8753#vn -0.0000 0.0216 0.9998#vn -0.0056 0.0208 0.9998#vn 0.1251 -0.4670 0.8753#vn 0.0000 -0.4835 0.8753#vn 0.1251 -0.4670 0.8753#vn 0.0000 -0.8604 0.5096#vn 0.0000 -0.4835 0.8753#vn 0.1251 -0.4670 0.8753#vn 0.2227 -0.8311 0.5096#vn 0.0000 -0.8604 0.5096#vn 0.2227 -0.8311 0.5096#vn 0.0000 -1.0000 0.0000#vn 0.0000 -0.8604 0.5096#vn 0.2227 -0.8311 0.5096#vn 0.2588 -0.9659 0.0000#vn 0.0000 -1.0000 0.0000#vn 0.2588 -0.9659 0.0000#vn 0.0000 -0.8604 -0.5096#vn 0.0000 -1.0000 0.0000#vn 0.2588 -0.9659 0.0000#vn 0.2227 -0.8311 -0.5096#vn 0.0000 -0.8604 -0.5096#vn 0.2227 -0.8311 -0.5096#vn 0.0000 -0.4835 -0.8753#vn 0.0000 -0.8604 -0.5096#vn 0.2227 -0.8311 -0.5096#vn 0.1251 -0.4670 -0.8753#vn 0.0000 -0.4835 -0.8753#vn 0.1251 -0.4670 -0.8753#vn -0.0000 0.0216 -0.9998#vn 0.0000 -0.4835 -0.8753#vn 0.1251 -0.4670 -0.8753#vn -0.0056 0.0208 -0.9998#vn -0.0000 0.0216 -0.9998#vn -0.0056 0.0208 -0.9998#vn -0.0000 0.5158 -0.8567#vn -0.0000 0.0216 -0.9998#vn -0.0056 0.0208 -0.9998#vn -0.1335 0.4982 -0.8567#vn -0.0000 0.5158 -0.8567#vn -0.1335 0.4982 -0.8567#vn -0.0000 0.8712 -0.4909#vn -0.0000 0.5158 -0.8567#vn -0.1335 0.4982 -0.8567#vn -0.2255 0.8415 -0.4909#vn -0.0000 0.8712 -0.4909#vn -0.2255 0.8415 -0.4909#vn -0.0000 1.0000 -0.0000#vn -0.0000 0.8712 -0.4909#vn -0.2255 0.8415 -0.4909#vn -0.2588 0.9659 -0.0000#vn -0.0000 1.0000 -0.0000#f 1//1 2//2 3//3 #f 1//4 4//5 2//6 #f 4//7 5//8 2//9 #f 4//10 6//11 5//12 #f 6//13 7//14 5//15 #f 6//16 8//17 7//18 #f 8//19 9//20 7//21 #f 8//22 10//23 9//24 #f 10//25 11//26 9//27 #f 10//28 12//29 11//30 #f 12//31 13//32 11//33 #f 12//34 14//35 13//36 #f 14//37 15//38 13//39 #f 14//40 16//41 15//42 #f 16//43 17//44 15//45 #f 16//46 18//47 17//48 #f 18//49 19//50 17//51 #f 18//52 20//53 19//54 #f 20//55 21//56 19//57 #f 20//58 22//59 21//60 #f 22//61 23//62 21//63 #f 22//64 24//65 23//66 #f 24//67 3//68 23//69 #f 24//70 1//71 3//72 #f 3//73 25//74 26//75 #f 3//76 2//77 25//78 #f 2//79 27//80 25//81 #f 2//82 5//83 27//84 #f 5//85 28//86 27//87 #f 5//88 7//89 28//90 #f 7//91 29//92 28//93 #f 7//94 9//95 29//96 #f 9//97 30//98 29//99 #f 9//100 11//101 30//102 #f 11//103 31//104 30//105 #f 11//106 13//107 31//108 #f 13//109 32//110 31//111 #f 13//112 15//113 32//114 #f 15//115 33//116 32//117 #f 15//118 17//119 33//120 #f 17//121 34//122 33//123 #f 17//124 19//125 34//126 #f 19//127 35//128 34//129 #f 19//130 21//131 35//132 #f 21//133 36//134 35//135 #f 21//136 23//137 36//138 #f 23//139 26//140 36//141 #f 23//142 3//143 26//144 #f 26//145 37//146 38//147 #f 26//148 25//149 37//150 #f 25//151 39//152 37//153 #f 25//154 27//155 39//156 #f 27//157 40//158 39//159 #f 27//160 28//161 40//162 #f 28//163 41//164 40//165 #f 28//166 29//167 41//168 #f 29//169 42//170 41//171 #f 29//172 30//173 42//174 #f 30//175 43//176 42//177 #f 30//178 31//179 43//180 #f 31//181 44//182 43//183 #f 31//184 32//185 44//186 #f 32//187 45//188 44//189 #f 32//190 33//191 45//192 #f 33//193 46//194 45//195 #f 33//196 34//197 46//198 #f 34//199 47//200 46//201 #f 34//202 35//203 47//204 #f 35//205 48//206 47//207 #f 35//208 36//209 48//210 #f 36//211 38//212 48//213 #f 36//214 26//215 38//216 #f 38//217 49//218 50//219 #f 38//220 37//221 49//222 #f 37//223 51//224 49//225 #f 37//226 39//227 51//228 #f 39//229 52//230 51//231 #f 39//232 40//233 52//234 #f 40//235 53//236 52//237 #f 40//238 41//239 53//240 #f 41//241 54//242 53//243 #f 41//244 42//245 54//246 #f 42//247 55//248 54//249 #f 42//250 43//251 55//252 #f 43//253 56//254 55//255 #f 43//256 44//257 56//258 #f 44//259 57//260 56//261 #f 44//262 45//263 57//264 #f 45//265 58//266 57//267 #f 45//268 46//269 58//270 #f 46//271 59//272 58//273 #f 46//274 47//275 59//276 #f 47//277 60//278 59//279 #f 47//280 48//281 60//282 #f 48//283 50//284 60//285 #f 48//286 38//287 50//288 #f 50//289 61//290 62//291 #f 50//292 49//293 61//294 #f 49//295 63//296 61//297 #f 49//298 51//299 63//300 #f 51//301 64//302 63//303 #f 51//304 52//305 64//306 #f 52//307 65//308 64//309 #f 52//310 53//311 65//312 #f 53//313 66//314 65//315 #f 53//316 54//317 66//318 #f 54//319 67//320 66//321 #f 54//322 55//323 67//324 #f 55//325 68//326 67//327 #f 55//328 56//329 68//330 #f 56//331 69//332 68//333 #f 56//334 57//335 69//336 #f 57//337 70//338 69//339 #f 57//340 58//341 70//342 #f 58//343 71//344 70//345 #f 58//346 59//347 71//348 #f 59//349 72//350 71//351 #f 59//352 60//353 72//354 #f 60//355 62//356 72//357 #f 60//358 50//359 62//360 #f 62//361 73//362 74//363 #f 62//364 61//365 73//366 #f 61//367 75//368 73//369 #f 61//370 63//371 75//372 #f 63//373 76//374 75//375 #f 63//376 64//377 76//378 #f 64//379 77//380 76//381 #f 64//382 65//383 77//384 #f 65//385 78//386 77//387 #f 65//388 66//389 78//390 #f 66//391 79//392 78//393 #f 66//394 67//395 79//396 #f 67//397 80//398 79//399 #f 67//400 68//401 80//402 #f 68//403 81//404 80//405 #f 68//406 69//407 81//408 #f 69//409 82//410 81//411 #f 69//412 70//413 82//414 #f 70//415 83//416 82//417 #f 70//418 71//419 83//420 #f 71//421 84//422 83//423 #f 71//424 72//425 84//426 #f 72//427 74//428 84//429 #f 72//430 62//431 74//432 #f 74//433 85//434 86//435 #f 74//436 73//437 85//438 #f 73//439 87//440 85//441 #f 73//442 75//443 87//444 #f 75//445 88//446 87//447 #f 75//448 76//449 88//450 #f 76//451 89//452 88//453 #f 76//454 77//455 89//456 #f 77//457 90//458 89//459 #f 77//460 78//461 90//462 #f 78//463 91//464 90//465 #f 78//466 79//467 91//468 #f 79//469 92//470 91//471 #f 79//472 80//473 92//474 #f 80//475 93//476 92//477 #f 80//478 81//479 93//480 #f 81//481 94//482 93//483 #f 81//484 82//485 94//486 #f 82//487 95//488 94//489 #f 82//490 83//491 95//492 #f 83//493 96//494 95//495 #f 83//496 84//497 96//498 #f 84//499 86//500 96//501 #f 84//502 74//503 86//504 #f 86//505 97//506 98//507 #f 86//508 85//509 97//510 #f 85//511 99//512 97//513 #f 85//514 87//515 99//516 #f 87//517 100//518 99//519 #f 87//520 88//521 100//522 #f 88//523 101//524 100//525 #f 88//526 89//527 101//528 #f 89//529 102//530 101//531 #f 89//532 90//533 102//534 #f 90//535 103//536 102//537 #f 90//538 91//539 103//540 #f 91//541 104//542 103//543 #f 91//544 92//545 104//546 #f 92//547 105//548 104//549 #f 92//550 93//551 105//552 #f 93//553 106//554 105//555 #f 93//556 94//557 106//558 #f 94//559 107//560 106//561 #f 94//562 95//563 107//564 #f 95//565 108//566 107//567 #f 95//568 96//569 108//570 #f 96//571 98//572 108//573 #f 96//574 86//575 98//576 #f 98//577 109//578 110//579 #f 98//580 97//581 109//582 #f 97//583 111//584 109//585 #f 97//586 99//587 111//588 #f 99//589 112//590 111//591 #f 99//592 100//593 112//594 #f 100//595 113//596 112//597 #f 100//598 101//599 113//600 #f 101//601 114//602 113//603 #f 101//604 102//605 114//606 #f 102//607 115//608 114//609 #f 102//610 103//611 115//612 #f 103//613 116//614 115//615 #f 103//616 104//617 116//618 #f 104//619 117//620 116//621 #f 104//622 105//623 117//624 #f 105//625 118//626 117//627 #f 105//628 106//629 118//630 #f 106//631 119//632 118//633 #f 106//634 107//635 119//636 #f 107//637 120//638 119//639 #f 107//640 108//641 120//642 #f 108//643 110//644 120//645 #f 108//646 98//647 110//648 #f 110//649 121//650 122//651 #f 110//652 109//653 121//654 #f 109//655 123//656 121//657 #f 109//658 111//659 123//660 #f 111//661 124//662 123//663 #f 111//664 112//665 124//666 #f 112//667 125//668 124//669 #f 112//670 113//671 125//672 #f 113//673 126//674 125//675 #f 113//676 114//677 126//678 #f 114//679 127//680 126//681 #f 114//682 115//683 127//684 #f 115//685 128//686 127//687 #f 115//688 116//689 128//690 #f 116//691 129//692 128//693 #f 116//694 117//695 129//696 #f 117//697 130//698 129//699 #f 117//700 118//701 130//702 #f 118//703 131//704 130//705 #f 118//706 119//707 131//708 #f 119//709 132//710 131//711 #f 119//712 120//713 132//714 #f 120//715 122//716 132//717 #f 120//718 110//719 122//720 #f 122//721 133//722 134//723 #f 122//724 121//725 133//726 #f 121//727 135//728 133//729 #f 121//730 123//731 135//732 #f 123//733 136//734 135//735 #f 123//736 124//737 136//738 #f 124//739 137//740 136//741 #f 124//742 125//743 137//744 #f 125//745 138//746 137//747 #f 125//748 126//749 138//750 #f 126//751 139//752 138//753 #f 126//754 127//755 139//756 #f 127//757 140//758 139//759 #f 127//760 128//761 140//762 #f 128//763 141//764 140//765 #f 128//766 129//767 141//768 #f 129//769 142//770 141//771 #f 129//772 130//773 142//774 #f 130//775 143//776 142//777 #f 130//778 131//779 143//780 #f 131//781 144//782 143//783 #f 131//784 132//785 144//786 #f 132//787 134//788 144//789 #f 132//790 122//791 134//792 #f 134//793 145//794 146//795 #f 134//796 133//797 145//798 #f 133//799 147//800 145//801 #f 133//802 135//803 147//804 #f 135//805 148//806 147//807 #f 135//808 136//809 148//810 #f 136//811 149//812 148//813 #f 136//814 137//815 149//816 #f 137//817 150//818 149//819 #f 137//820 138//821 150//822 #f 138//823 151//824 150//825 #f 138//826 139//827 151//828 #f 139//829 152//830 151//831 #f 139//832 140//833 152//834 #f 140//835 153//836 152//837 #f 140//838 141//839 153//840 #f 141//841 154//842 153//843 #f 141//844 142//845 154//846 #f 142//847 155//848 154//849 #f 142//850 143//851 155//852 #f 143//853 156//854 155//855 #f 143//856 144//857 156//858 #f 144//859 146//860 156//861 #f 144//862 134//863 146//864 #f 146//865 157//866 158//867 #f 146//868 145//869 157//870 #f 145//871 159//872 157//873 #f 145//874 147//875 159//876 #f 147//877 160//878 159//879 #f 147//880 148//881 160//882 #f 148//883 161//884 160//885 #f 148//886 149//887 161//888 #f 149//889 162//890 161//891 #f 149//892 150//893 162//894 #f 150//895 163//896 162//897 #f 150//898 151//899 163//900 #f 151//901 164//902 163//903 #f 151//904 152//905 164//906 #f 152//907 165//908 164//909 #f 152//910 153//911 165//912 #f 153//913 166//914 165//915 #f 153//916 154//917 166//918 #f 154//919 167//920 166//921 #f 154//922 155//923 167//924 #f 155//925 168//926 167//927 #f 155//928 156//929 168//930 #f 156//931 158//932 168//933 #f 156//934 146//935 158//936 #f 158//937 169//938 170//939 #f 158//940 157//941 169//942 #f 157//943 171//944 169//945 #f 157//946 159//947 171//948 #f 159//949 172//950 171//951 #f 159//952 160//953 172//954 #f 160//955 173//956 172//957 #f 160//958 161//959 173//960 #f 161//961 174//962 173//963 #f 161//964 162//965 174//966 #f 162//967 175//968 174//969 #f 162//970 163//971 175//972 #f 163//973 176//974 175//975 #f 163//976 164//977 176//978 #f 164//979 177//980 176//981 #f 164//982 165//983 177//984 #f 165//985 178//986 177//987 #f 165//988 166//989 178//990 #f 166//991 179//992 178//993 #f 166//994 167//995 179//996 #f 167//997 180//998 179//999 #f 167//1000 168//1001 180//1002 #f 168//1003 170//1004 180//1005 #f 168//1006 158//1007 170//1008 #f 170//1009 181//1010 182//1011 #f 170//1012 169//1013 181//1014 #f 169//1015 183//1016 181//1017 #f 169//1018 171//1019 183//1020 #f 171//1021 184//1022 183//1023 #f 171//1024 172//1025 184//1026 #f 172//1027 185//1028 184//1029 #f 172//1030 173//1031 185//1032 #f 173//1033 186//1034 185//1035 #f 173//1036 174//1037 186//1038 #f 174//1039 187//1040 186//1041 #f 174//1042 175//1043 187//1044 #f 175//1045 188//1046 187//1047 #f 175//1048 176//1049 188//1050 #f 176//1051 189//1052 188//1053 #f 176//1054 177//1055 189//1056 #f 177//1057 190//1058 189//1059 #f 177//1060 178//1061 190//1062 #f 178//1063 191//1064 190//1065 #f 178//1066 179//1067 191//1068 #f 179//1069 192//1070 191//1071 #f 179//1072 180//1073 192//1074 #f 180//1075 182//1076 192//1077 #f 180//1078 170//1079 182//1080 #f 182//1081 193//1082 194//1083 #f 182//1084 181//1085 193//1086 #f 181//1087 195//1088 193//1089 #f 181//1090 183//1091 195//1092 #f 183//1093 196//1094 195//1095 #f 183//1096 184//1097 196//1098 #f 184//1099 197//1100 196//1101 #f 184//1102 185//1103 197//1104 #f 185//1105 198//1106 197//1107 #f 185//1108 186//1109 198//1110 #f 186//1111 199//1112 198//1113 #f 186//1114 187//1115 199//1116 #f 187//1117 200//1118 199//1119 #f 187//1120 188//1121 200//1122 #f 188//1123 201//1124 200//1125 #f 188//1126 189//1127 201//1128 #f 189//1129 202//1130 201//1131 #f 189//1132 190//1133 202//1134 #f 190//1135 203//1136 202//1137 #f 190//1138 191//1139 203//1140 #f 191//1141 204//1142 203//1143 #f 191//1144 192//1145 204//1146 #f 192//1147 194//1148 204//1149 #f 192//1150 182//1151 194//1152 #f 194//1153 205//1154 206//1155 #f 194//1156 193//1157 205//1158 #f 193//1159 207//1160 205//1161 #f 193//1162 195//1163 207//1164 #f 195//1165 208//1166 207//1167 #f 195//1168 196//1169 208//1170 #f 196//1171 209//1172 208//1173 #f 196//1174 197//1175 209//1176 #f 197//1177 210//1178 209//1179 #f 197//1180 198//1181 210//1182 #f 198//1183 211//1184 210//1185 #f 198//1186 199//1187 211//1188 #f 199//1189 212//1190 211//1191 #f 199//1192 200//1193 212//1194 #f 200//1195 213//1196 212//1197 #f 200//1198 201//1199 213//1200 #f 201//1201 214//1202 213//1203 #f 201//1204 202//1205 214//1206 #f 202//1207 215//1208 214//1209 #f 202//1210 203//1211 215//1212 #f 203//1213 216//1214 215//1215 #f 203//1216 204//1217 216//1218 #f 204//1219 206//1220 216//1221 #f 204//1222 194//1223 206//1224 #f 206//1225 217//1226 218//1227 #f 206//1228 205//1229 217//1230 #f 205//1231 219//1232 217//1233 #f 205//1234 207//1235 219//1236 #f 207//1237 220//1238 219//1239 #f 207//1240 208//1241 220//1242 #f 208//1243 221//1244 220//1245 #f 208//1246 209//1247 221//1248 #f 209//1249 222//1250 221//1251 #f 209//1252 210//1253 222//1254 #f 210//1255 223//1256 222//1257 #f 210//1258 211//1259 223//1260 #f 211//1261 224//1262 223//1263 #f 211//1264 212//1265 224//1266 #f 212//1267 225//1268 224//1269 #f 212//1270 213//1271 225//1272 #f 213//1273 226//1274 225//1275 #f 213//1276 214//1277 226//1278 #f 214//1279 227//1280 226//1281 #f 214//1282 215//1283 227//1284 #f 215//1285 228//1286 227//1287 #f 215//1288 216//1289 228//1290 #f 216//1291 218//1292 228//1293 #f 216//1294 206//1295 218//1296 #f 218//1297 229//1298 230//1299 #f 218//1300 217//1301 229//1302 #f 217//1303 231//1304 229//1305 #f 217//1306 219//1307 231//1308 #f 219//1309 232//1310 231//1311 #f 219//1312 220//1313 232//1314 #f 220//1315 233//1316 232//1317 #f 220//1318 221//1319 233//1320 #f 221//1321 234//1322 233//1323 #f 221//1324 222//1325 234//1326 #f 222//1327 235//1328 234//1329 #f 222//1330 223//1331 235//1332 #f 223//1333 236//1334 235//1335 #f 223//1336 224//1337 236//1338 #f 224//1339 237//1340 236//1341 #f 224//1342 225//1343 237//1344 #f 225//1345 238//1346 237//1347 #f 225//1348 226//1349 238//1350 #f 226//1351 239//1352 238//1353 #f 226//1354 227//1355 239//1356 #f 227//1357 240//1358 239//1359 #f 227//1360 228//1361 240//1362 #f 228//1363 230//1364 240//1365 #f 228//1366 218//1367 230//1368 #f 230//1369 241//1370 242//1371 #f 230//1372 229//1373 241//1374 #f 229//1375 243//1376 241//1377 #f 229//1378 231//1379 243//1380 #f 231//1381 244//1382 243//1383 #f 231//1384 232//1385 244//1386 #f 232//1387 245//1388 244//1389 #f 232//1390 233//1391 245//1392 #f 233//1393 246//1394 245//1395 #f 233//1396 234//1397 246//1398 #f 234//1399 247//1400 246//1401 #f 234//1402 235//1403 247//1404 #f 235//1405 248//1406 247//1407 #f 235//1408 236//1409 248//1410 #f 236//1411 249//1412 248//1413 #f 236//1414 237//1415 249//1416 #f 237//1417 250//1418 249//1419 #\
f 237//1420 238//1421 250//1422 #f 238//1423 251//1424 250//1425 #f 238//1426 239//1427 251//1428 #f 239//1429 252//1430 251//1431 #f 239//1432 240//1433 252//1434 #f 240//1435 242//1436 252//1437 #f 240//1438 230//1439 242//1440 #f 242//1441 253//1442 254//1443 #f 242//1444 241//1445 253//1446 #f 241//1447 255//1448 253//1449 #f 241//1450 243//1451 255//1452 #f 243//1453 256//1454 255//1455 #f 243//1456 244//1457 256//1458 #f 244//1459 257//1460 256//1461 #f 244//1462 245//1463 257//1464 #f 245//1465 258//1466 257//1467 #f 245//1468 246//1469 258//1470 #f 246//1471 259//1472 258//1473 #f 246//1474 247//1475 259//1476 #f 247//1477 260//1478 259//1479 #f 247//1480 248//1481 260//1482 #f 248//1483 261//1484 260//1485 #f 248//1486 249//1487 261//1488 #f 249//1489 262//1490 261//1491 #f 249//1492 250//1493 262//1494 #f 250//1495 263//1496 262//1497 #f 250//1498 251//1499 263//1500 #f 251//1501 264//1502 263//1503 #f 251//1504 252//1505 264//1506 #f 252//1507 254//1508 264//1509 #f 252//1510 242//1511 254//1512 #f 254//1513 265//1514 266//1515 #f 254//1516 253//1517 265//1518 #f 253//1519 267//1520 265//1521 #f 253//1522 255//1523 267//1524 #f 255//1525 268//1526 267//1527 #f 255//1528 256//1529 268//1530 #f 256//1531 269//1532 268//1533 #f 256//1534 257//1535 269//1536 #f 257//1537 270//1538 269//1539 #f 257//1540 258//1541 270//1542 #f 258//1543 271//1544 270//1545 #f 258//1546 259//1547 271//1548 #f 259//1549 272//1550 271//1551 #f 259//1552 260//1553 272//1554 #f 260//1555 273//1556 272//1557 #f 260//1558 261//1559 273//1560 #f 261//1561 274//1562 273//1563 #f 261//1564 262//1565 274//1566 #f 262//1567 275//1568 274//1569 #f 262//1570 263//1571 275//1572 #f 263//1573 276//1574 275//1575 #f 263//1576 264//1577 276//1578 #f 264//1579 266//1580 276//1581 #f 264//1582 254//1583 266//1584 #f 266//1585 277//1586 278//1587 #f 266//1588 265//1589 277//1590 #f 265//1591 279//1592 277//1593 #f 265//1594 267//1595 279//1596 #f 267//1597 280//1598 279//1599 #f 267//1600 268//1601 280//1602 #f 268//1603 281//1604 280//1605 #f 268//1606 269//1607 281//1608 #f 269//1609 282//1610 281//1611 #f 269//1612 270//1613 282//1614 #f 270//1615 283//1616 282//1617 #f 270//1618 271//1619 283//1620 #f 271//1621 284//1622 283//1623 #f 271//1624 272//1625 284//1626 #f 272//1627 285//1628 284//1629 #f 272//1630 273//1631 285//1632 #f 273//1633 286//1634 285//1635 #f 273//1636 274//1637 286//1638 #f 274//1639 287//1640 286//1641 #f 274//1642 275//1643 287//1644 #f 275//1645 288//1646 287//1647 #f 275//1648 276//1649 288//1650 #f 276//1651 278//1652 288//1653 #f 276//1654 266//1655 278//1656 #f 278//1657 4//1658 1//1659 #f 278//1660 277//1661 4//1662 #f 277//1663 6//1664 4//1665 #f 277//1666 279//1667 6//1668 #f 279//1669 8//1670 6//1671 #f 279//1672 280//1673 8//1674 #f 280//1675 10//1676 8//1677 #f 280//1678 281//1679 10//1680 #f 281//1681 12//1682 10//1683 #f 281//1684 282//1685 12//1686 #f 282//1687 14//1688 12//1689 #f 282//1690 283//1691 14//1692 #f 283//1693 16//1694 14//1695 #f 283//1696 284//1697 16//1698 #f 284//1699 18//1700 16//1701 #f 284//1702 285//1703 18//1704 #f 285//1705 20//1706 18//1707 #f 285//1708 286//1709 20//1710 #f 286//1711 22//1712 20//1713 #f 286//1714 287//1715 22//1716 #f 287//1717 24//1718 22//1719 #f 287//1720 288//1721 24//1722 #f 288//1723 1//1724 24//1725 #f 288//1726 278//1727 1//1728 ";
