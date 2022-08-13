let iterations = 7;
let power = 10;
let bailout = 50;
let colorIterations = 3;
let spin = true;

function setIterations(itr) {
	iterations = itr;
	updateGLSL();
}

function setPower(pow) {
	power = pow;
	updateGLSL();
}

function setBailout(bout) {
	this.bailout = bout;
	updateGLSL();
}

function setColorIterations(colorItr) {
	colorIterations = colorItr;
	updateGLSL();
}

function setSpin(spn) {
	spin = spn;
	updateGLSL();
}

const DEFAULT_FRACTAL_COLOR = 'vec3(orbitTrap.x * 0.2, orbitTrap.y * 0.4, orbitTrap.z * 0.9) + diffuse';
const DEFAULT_FRACTAL_COLOR_BRIGHT = 'vec3(orbitTrap.x * 0.2, orbitTrap.y * 0.4, orbitTrap.z * 0.9) + diffuse + 0.2';

let MANDELBULB_GLSL;
let SPHERE_SPONGE_GLSL;
updateGLSL();

function updateGLSL() {
	MANDELBULB_GLSL = 
`
	vec4 orbitTrap = vec4(MAX_DIST);
	float distanceFunction(vec3 position, bool isLight) {
		${spin ? 'position = (vec4(position, 0.0) * rotateXaxis(PI / 2.0) * rotateZaxis(mod(uTime / 2.0, 2.0 * PI))).xyz;' : ''}
		if(!isLight) orbitTrap = vec4(MAX_DIST);
		vec3 z = position;
		float dr = 1.0;
		float r = 0.0;
		for (int i = 0; i < ${iterations} ; i++) {
			r = length(z);
			if (r > ${bailout.toFixed(5)}) 
				break;
			float theta = acos(z.z/r);
			float phi = atan(z.y,z.x);
			dr =  pow( r, ${power.toFixed(5)} - 1.0 ) * ${power.toFixed(5)} * dr + 1.0;
			float zr = pow(r, ${power.toFixed(5)});
			theta = theta * ${power.toFixed(5)};
			phi = phi * ${power.toFixed(5)};
			z = zr * vec3(sin(theta)*cos(phi), sin(phi)*sin(theta), cos(theta));
			z += position;
			if (i < ${colorIterations} && !isLight) orbitTrap = min(orbitTrap,abs(vec4(z.x,z.y,z.z,r*r)));
		}
		return 0.5*log(r)*r/dr;
	}
`;

	SPHERE_SPONGE_GLSL =
`
vec4 orbitTrap = vec4(MAX_DIST);
float distanceFunction(vec3 position, bool isLight) {
	${spin ? 'position = (vec4(position, 0.0) * rotateXaxis(PI / 2.0) * rotateZaxis(mod(uTime / 2.0, 2.0 * PI))).xyz;' : ''}
    if(!isLight) orbitTrap = vec4(MAX_DIST);
    float scale = 2.0;
    float spongeScale = 2.05;
    float k = scale;
    float d = -10000.0;
    float d1, r, md = 100000.0, cd = 0.0;

    for (int i = 0; i < int(${iterations}); i++) {
        vec3 z = mod(position * k, 4.0) - vec3(0.5 * 4.0);
        r = length(z);
        d1 = (spongeScale - r) / k;
        k *= scale;
        d = max(d, d1);
        if (i < ${colorIterations} && !isLight) {
            md = min(md, d);
            cd = r;
            orbitTrap = vec4(md*r, md*r, md*r, md*r);
        }
    }
    return d;
}
`;
}