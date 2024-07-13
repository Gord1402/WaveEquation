const infinity = 9999;
let recording = false;
let capturer = null;

let log = console.log;

//starting frame 776 of 776
function parseConsoleLog() {
    if ((""+arguments[0]).includes("starting frame")){
        let numbers = (""+arguments[0]).match(/\b\d+\b/g);
        document.getElementById("progress-bar").value = Number(numbers[0]) / Number(numbers[1]) * 100;
    }
    if ((""+arguments[0]).includes("rendering finished")){
        document.getElementById("progress-bar").value = 0;
    }
    log(...arguments);
}

console.log = parseConsoleLog;

const params = new Proxy(new URLSearchParams(window.location.search), {
    get: (searchParams, prop) => searchParams.get(prop),
});

if (params.data){
    let data = JSON.parse(params.data);
    document.getElementById("pos").value = data[0];
    document.getElementById("mas").value = data[1];
}

function compute(positions, velocities, mass, dt) {
    positions_buffer = positions;
    velocities_buffer = velocities;
    for (let i = 1; i < positions.length - 1; i++) {
        for (let j = 1; j < positions[0].length - 1; j++) {
            if (mass[i][j] < infinity) {
                dv = -((positions[i][j] - positions[i - 1][j]) +
                    (positions[i][j] - positions[i + 1][j]) +
                    (positions[i][j] - positions[i][j - 1]) +
                    (positions[i][j] - positions[i][j + 1])) * dt / mass[i][j];
                positions_buffer[i][j] += velocities[i][j] * dt;
                velocities_buffer[i][j] += dv;
            }
        }
    }
    return [positions_buffer, velocities_buffer];
}

function color(r, g, b) {
    return "rgba(" + Math.floor(r) + "," + Math.floor(g) + "," + Math.floor(b) + "," + 1 + ")";
}

function gradient(t) {
    r = Math.min(1, Math.max(0, t));
    g = Math.min(1, Math.max(0, t));
    b = Math.min(1, Math.max(0, t));
    return color(r * 255, g * 255, b * 255);
}

let canvas = document.getElementById("draw");
let context = canvas.getContext("2d");

let colorbar = document.getElementById("colorbar");
let colorbar_context = colorbar.getContext("2d");

let screen = document.getElementById("screen");
let screen_context = screen.getContext("2d");

function imshow(arr, clim) {
    let rect_size = Math.floor(canvas.clientHeight / arr.length);
    for (let i = 1; i < arr.length - 1; i++) {
        for (let j = 1; j < arr[0].length - 1; j++) {
            let t = ((arr[i][j] - clim[0]) / (clim[1] - clim[0]));
            context.fillStyle = mass[i][j] < infinity ? gradient(Math.pow(t, 0.5)) : color(255, 0, 0);
            context.fillRect(j * rect_size, i * rect_size, rect_size, rect_size);
        }
    }

    for (let i = 1; i < arr[0].length - 1; i++) {
        let t = ((arr[1][i] - clim[0]) / (clim[1] - clim[0]));
        screen_context.fillStyle = mass[1][i] < infinity ? gradient(Math.pow(Math.abs(t - 0.5), 0.2)) : color(255, 0, 0);
        screen_context.fillRect(i * rect_size, 0, rect_size, colorbar.clientHeight);
    }
}

function colorbar_show(clim) {
    for (let i = 1; i < colorbar.clientHeight; i++) {
        let t = (i / colorbar.clientHeight);
        colorbar_context.fillStyle = gradient(Math.pow(1 - t, 0.5));
        colorbar_context.fillRect(0, i, colorbar.clientWidth, 1);
    }
}

function check_in(a, width, height) {
    return a[0] >= 0 && a[0] < width && a[1] >= 0 && a[1] < height;
}

function init() {
    {
        let pos_eval = eval(document.getElementById("pos").value);
        let width = size;
        let height = size;
        positions = [];
        velocities = [];
        mass = [];
        for (let i = 0; i < size; i++) {
            positions.push([]);
            velocities.push([]);
            mass.push([]);
            for (let j = 0; j < size; j++) {
                let x = j / size * (x_lim[1] - x_lim[0]) + x_lim[0];
                let y = i / size * (y_lim[1] - y_lim[0]) + y_lim[0];
                positions[i].push(pos_eval(x, y));
                velocities[i].push(0);
                if (i == 0 || i == size - 1 || j == 0 || j == size - 1) mass[i].push(99999);
                else mass[i].push(1);
            }
        }


        function set_mass_line(from, to, value) {
            if (check_in([Math.floor(from[0]), Math.floor(from[1])], width, height))
                mass[Math.floor(from[1])][Math.floor(from[0])] = value;
            while (Math.pow(to[0] - from[0], 2) + Math.pow(to[1] - from[1], 2) > 0.2) {
                let dx = Math.sign(to[0] - from[0]);
                let dy = Math.sign(to[1] - from[1]);

                from[0] += dx * 0.1;
                from[1] += dy * 0.1;

                if (check_in([Math.floor(from[0]), Math.floor(from[1])], width, height))
                    mass[Math.floor(from[1])][Math.floor(from[0])] = value;
            }
        }
        function set_mass(at, value) {
            if (check_in([Math.floor(at[0]), Math.floor(at[1])], width, height))
                mass[Math.floor(at[1])][Math.floor(at[0])] = value;
        }

        eval(document.getElementById("mas").value);
    }
}

function startRecording() {
    init();
    capturer = new CCapture( { format: document.getElementById("format").value, workersPath: '' } );
    capturer.start();
    recording = true;
    document.getElementById("record").hidden = true;
    document.getElementById("stop").hidden = false;
}

function stopRecording() {
    document.getElementById("record").hidden = false;
    document.getElementById("stop").hidden = true;
    recording=false;
    capturer.stop();
    capturer.save();
    console.log("Saved.");
}
function MakeHref() {
    let data = [document.getElementById("pos").value, document.getElementById("mas").value];
    document.getElementById("href_text").value = location.protocol + '//' + location.host + location.pathname + "?data=" + encodeURIComponent(JSON.stringify(data));
}


let size = 100;

let positions = [];
let velocities = [];
let mass = [];

let x_lim = [-1, 1];
let y_lim = [-1, 1];

let dt = 0.01;

init();

colorbar_show([-2, 2]);
setInterval(() => {
    for (let k = 0; k < 10; k++) {
        res = compute(positions, velocities, mass, dt);
        positions = res[0];
        velocities = res[1];
    }
    imshow(positions, [-2., 2.]);
    if (recording){
        capturer.capture( canvas );
    }
}, 4);
