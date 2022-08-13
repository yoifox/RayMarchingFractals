let maxDistance = 1000.0;
let maxSteps = 256;
let minDistance = 0.01;
let skyColorFunction = 'vec3(0, 0, 1)';
let colorFunction = 'vec3(diffuse)';
let lightFunction = 'vec3(0, 15, 0)';
let shadows = true;
let reflectness = 0.5;
let reflections = 0;

const vertexShaderCode = `
precision highp float;
attribute vec2 position;

void main() {
	gl_Position = vec4(position, 0, 1);
}
`;

let fragmentShaderCode = `
#define PI 3.1415925359
#define MAX_STEPS #MAX_STEPS
#define MAX_DIST #MAX_DISTANCE
#define MIN_DIST #MIN_DISTANCE

precision highp float;
uniform vec2 uResolution;
uniform float uTime;
uniform vec3 uPosition;
uniform vec3 uRotation;

int steps = 0;

${TRANSFORMATIONS_GLSL}

#DISTANCE_FUNCTION

float sceneDE(vec3 position, bool isLight) {
	return distanceFunction(position, isLight);
}

float rayMarch(vec3 rayPos, vec3 rayDir, bool isLight) {
	float marchedDistance = 0.0;
	for(int i = 0; i < MAX_STEPS; i++) {
		steps = i;
		vec3 p = rayPos + rayDir * marchedDistance;
		float minDistance = sceneDE(p, isLight);
		marchedDistance += minDistance;
		if(marchedDistance > MAX_DIST || minDistance < MIN_DIST) 
			break;
	}
	return marchedDistance;
}
 
vec3 getNormal(vec3 p) {
	float distance = sceneDE(p, true);
	vec2 epsilon = vec2(0.01, 0);
	vec3 n = distance - vec3(
	sceneDE(p - epsilon.xyy, true),
	sceneDE(p - epsilon.yxy, true),
	sceneDE(p - epsilon.yyx, true));
	return normalize(n);
}

float getLight(vec3 p) { 
	//vec3 lightPos = vec3(15.0 * sin(uTime), 15.0, 15.0 * cos(uTime));
	vec3 lightPos = #LIGHT_FUNCTION;
	vec3 lightDir = normalize(lightPos-p);
	vec3 normal = getNormal(p);
	
	float diffuse = dot(normal, lightDir);
	diffuse = clamp(diffuse, 0.0, 1.0);
	
	#SHADOWS
 
	return diffuse;
}

void main() {
	vec2 uv = (gl_FragCoord.xy - 0.5 * uResolution.xy) / uResolution.y;
	
	vec3 cameraPos = uPosition;
	vec3 rayDir = normalize(vec3(uv.x, uv.y, 1));
	rayDir = (vec4(rayDir, 0.0) * rotateXYZ(uRotation)).xyz;
	
	vec3 fragColor;
	
	for(int i = 0; i < #REFLECTIONS + 1; i++) {
		vec3 normal;
		if(i > 0) {
			normal = getNormal(cameraPos);
			rayDir = reflect(rayDir, normal) + uRotation / 2.0;
		}
		float distance = rayMarch(i > 0 ? cameraPos + normal * MIN_DIST : cameraPos, rayDir, false);
		cameraPos += rayDir * distance;
		float diffuse = getLight(cameraPos);
		vec3 color = #COLOR_FUNCTION;
		if(distance > MAX_DIST)
			color = #SKY_COLOR_FUNCTION;
		if(steps == MAX_STEPS) 
			color = #SKY_COLOR_FUNCTION;
		
		if(i > 0) fragColor = mix(fragColor, color, #REFLECTNESS);
		else fragColor = color;
	}
	gl_FragColor = vec4(fragColor, 1.0);
}
`;