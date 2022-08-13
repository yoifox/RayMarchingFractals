let gl, canvas;
let uPosition, uTime, uResolution, uRotation;
let cameraPosition = {x: 0, y: 0, z: -3.5};
let cameraRotation = {x: 0, y: 0, z: 0};
let mouseMoveEvent, isMousePressed;
let moveSpeed = 0.01, lookSpeed = 0.25;
let frameIntervalMS = 1;
let moveOnlyWhenMouseInside = true;
let mouseInside = false;

function compile(distanceFunction) {
	fragmentShaderCode = fragmentShaderCode.replace(/#DISTANCE_FUNCTION/g, distanceFunction);
	fragmentShaderCode = fragmentShaderCode.replace(/#COLOR_FUNCTION/g, colorFunction);
	fragmentShaderCode = fragmentShaderCode.replace(/#SKY_COLOR_FUNCTION/g, skyColorFunction);
	fragmentShaderCode = fragmentShaderCode.replace(/#MAX_DISTANCE/g, maxDistance.toFixed(5));
	fragmentShaderCode = fragmentShaderCode.replace(/#MIN_DISTANCE/g, minDistance.toFixed(5));
	fragmentShaderCode = fragmentShaderCode.replace(/#MAX_STEPS/g, maxSteps);
	fragmentShaderCode = fragmentShaderCode.replace(/#LIGHT_FUNCTION/g, lightFunction);
	fragmentShaderCode = fragmentShaderCode.replace(/#REFLECTNESS/g, reflectness.toFixed(5));
	fragmentShaderCode = fragmentShaderCode.replace(/#REFLECTIONS/g, reflections);
	fragmentShaderCode = fragmentShaderCode.replace(/#EXTRA/g, extra);
	fragmentShaderCode = fragmentShaderCode.replace(/#SPIN/g, 
			spin ? 'position = (vec4(position, 0.0) * rotateXaxis(PI / 2.0) * rotateZaxis(mod(uTime / 2.0, 2.0 * PI))).xyz;' : '');
	fragmentShaderCode = fragmentShaderCode.replace(/#SHADOWS/g, 
						!shadows ? '' : `
						float d = rayMarch(p + normal * MIN_DIST * 2.0, lightDir, true);
						if(d < length(lightPos-p)) diffuse *= 0.1;
						`);
	
	canvas = document.getElementById('rm-canvas');
	gl = canvas.getContext('webgl');
	if(!gl)
		gl = canvas.getContext('experimental-webgl');

	let vertexShader = gl.createShader(gl.VERTEX_SHADER);
	let fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
		
	gl.shaderSource(vertexShader, vertexShaderCode);
	gl.shaderSource(fragmentShader, fragmentShaderCode);
		
	gl.compileShader(vertexShader);
	if(!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS))
		throw ("compilation error: " + gl.getShaderInfoLog(vertexShader));
	gl.compileShader(fragmentShader);
	if(!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS))
		throw ("compilation error: " + gl.getShaderInfoLog(fragmentShader));
		
	let program = gl.createProgram();
	gl.attachShader(program, vertexShader);
	gl.attachShader(program, fragmentShader);
		
	gl.linkProgram(program);
	if(!gl.getProgramParameter(program, gl.LINK_STATUS))
		throw ("linking error: " + gl.getProgramInfoLog(program));
		
	gl.validateProgram(program);
	if(!gl.getProgramParameter(program, gl.VALIDATE_STATUS))
		throw ("validation error: " + gl.getProgramInfoLog(program));
	
	uTime = gl.getUniformLocation(program, 'uTime');
	uResolution = gl.getUniformLocation(program, 'uResolution');
	uPosition = gl.getUniformLocation(program, 'uPosition');
	uRotation = gl.getUniformLocation(program, 'uRotation');
	
	let vertices = new Float32Array([-1, 1, -1, -1, 1, 1, 1, -1]);
	let vao = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, vao);
	gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
	gl.vertexAttribPointer(0, 2, gl.FLOAT, gl.FALSE, 2 * Float32Array.BYTES_PER_ELEMENT, 0);
	gl.enableVertexAttribArray(0);

	gl.useProgram(program);
	
	setInterval(() => {
		update(frameIntervalMS / 100);
	}, frameIntervalMS);
	
	addEventListener('keydown', e => {
		if(moveOnlyWhenMouseInside && !mouseInside) return;
		keyPress(e)
	});
	
	addEventListener('keyup', e => keyRelease(e));
	canvas.addEventListener('mousemove', e => mouseMoveEvent = e);
	canvas.addEventListener('mouseup', e => isMousePressed = false);
	canvas.addEventListener('mousedown', e => isMousePressed = true);
	canvas.onmouseenter = () => mouseInside = true;
	canvas.onmouseout = () => mouseInside = false;
};

let totalTime = 0;
function update(delta) {
	cameraPosition = getNewPosition(cameraPosition, cameraRotation, moveSpeed);
	if(mouseMoveEvent) cameraRotation = getNewRotation(cameraRotation, mouseMoveEvent, isMousePressed, lookSpeed);
	totalTime += delta;
	gl.uniform2f(uResolution, canvas.width, canvas.height);
	gl.uniform1f(uTime, totalTime);
	gl.uniform3f(uPosition, cameraPosition.x, cameraPosition.y, cameraPosition.z);
	gl.uniform3f(uRotation, toRadians(cameraRotation.x), toRadians(cameraRotation.y), toRadians(cameraRotation.z));
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
	gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
}
