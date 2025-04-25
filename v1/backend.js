var board="main";

async function getDirs(path = "") {
    const response = await fetch('/boards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path })
    });

    const text = await response.text();
    console.log("Respuesta cruda:", text);

    try {
        const data = JSON.parse(text);
        return data.items;
    } catch (err) {
        console.error("JSON inválido:", err);
        return [];
    }
}

async function readdoc(path = "") {
    const response = await fetch('/readfile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path })
    });

    const text = await response.text();  // Obtenemos la respuesta como texto
    console.log("Respuesta cruda:", text);

    try {
        const data = JSON.parse(text);  // Intentamos convertir el string JSON a objeto
        return data;  // Devolvemos el contenido del archivo (debe estar en `data.content`)
    } catch (err) {
        console.error("JSON inválido:", err);
        return null;  // En caso de error, devolvemos null
    }
}

async function saveFile(path, content) {
    const response = await fetch('/savefile', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            path: path,      // Ruta del archivo donde guardarlo
            content: content // El contenido que deseas guardar
        })
    });

    const result = await response.json();  // Obtener la respuesta en formato JSON
    console.log(result);  // Mostrar el resultado de la operación
}

async function barrBoard() {
    reloadall()
    const dir = await getDirs();
    const barrDiv = document.getElementById('BARR');

    for (const item of dir) {
        barrDiv.innerHTML += `<button onclick="pin('${item.name}')">${item.name}</button> `;
    }
}

function pin(name){
    board=name;
    reloadall()
    reloadBoard()
}

function reloadall(){
    document.getElementById("boardpost").innerText="BOARD: /"+board+"/";
    document.getElementById("BARR").innerHTML="";
}

async function reloadBoard() {
    reloadall();
    const boardDirs = await getDirs(board);

    for (let i = 0; i < boardDirs.length; i++) {
        const hexId = i.toString(16).toUpperCase().padStart(8, '0');
        const postPath = `${board}/${hexId}P`;  // Aquí ya no cambia la estructura de la ruta principal
        const postFile = `${postPath}/POST.json`; // Asegúrate de que la ruta esté correcta

        try {
            const postData = await readdoc(postFile);
            document.getElementById("BARR").innerHTML += `
                <button onclick="post(0,${i})">#</button> 
                <span><b>${postData["NAME"]}</b>: ${postData["TEXT"]}</span><br>
            `;

            // Leer subposts
            const subPostDir = `${postPath}`;  // Cambié esta línea para que sea directamente el directorio del post
            const subDirs = await getDirs(subPostDir);

            for (let j = 0; j < subDirs.length-1; j++) {
                const subHexId = j.toString(16).toUpperCase().padStart(4, '0');
                const subPostFile = `${subPostDir}/${subHexId}S.json`;  // Asegúrate de que el archivo correcto esté en la ruta

                try {
                    const subPostData = await readdoc(subPostFile);
                    document.getElementById("BARR").innerHTML += `
                        &nbsp;&nbsp;↳ <span><b>${subPostData["NAME"]}</b>: ${subPostData["TEXT"]}</span><br>
                    `;
                } catch (err) {
                    console.error(`❌ Subpost no leído (${subPostFile}):`, err);
                }
            }

        } catch (err) {
            console.error(`❌ Post principal no leído (${postFile}):`, err);
        }
    }
}


function post(sub, id = 0) {
    reloadall();

    if (sub) {
        document.getElementById("BARR").innerHTML += `<p>POST: /${board}/</p>`;
    } else {
        document.getElementById("BARR").innerHTML += `<p>SUBPOST: /${board}/${id}/</p>`;
    }

    document.getElementById("BARR").innerHTML += `<span>name: </span>`;
    document.getElementById("BARR").innerHTML += `<input id="postName"><br>`;
    document.getElementById("BARR").innerHTML += `<span>text: </span>`;
    document.getElementById("BARR").innerHTML += `<textarea id="postText" rows="5" cols="40"></textarea><br>`;

    if (sub) {
        document.getElementById("BARR").innerHTML += `<button onclick='postpost()'>OK</button>`;
    } else {
        document.getElementById("BARR").innerHTML += `<button onclick='postsubpost(${id})'>OK</button>`;
    }
}

async function postpost() {
    const name = document.getElementById("postName").value.trim();
    const text = document.getElementById("postText").value.trim();
    if (!name || !text) return alert("Nombre y texto requeridos");

    const dirs = await getDirs(board);
    const id = dirs.length;
    const hexId = id.toString(16).toUpperCase().padStart(8, '0');
    const path = `${board}/${hexId}P/POST.json`;

    const content = {
        NAME: name,
        TEXT: text
    };

    await saveFile(path, content);
    reloadBoard();
}

async function postsubpost(postid) {
    const name = document.getElementById("postName").value.trim();
    const text = document.getElementById("postText").value.trim();
    if (!name || !text) return alert("Nombre y texto requeridos");

    const id = postid;
    const hexId = id.toString(16).toUpperCase().padStart(8, '0');
    const postpath = `${board}/${hexId}P`;

    const sdirs = await getDirs(postpath);
    const sid = sdirs.length-1;
    const shexId = sid.toString(16).toUpperCase().padStart(4, '0');
    const path = `${postpath}/${shexId}S.json`;  // Cambié la ruta aquí para usar los subposts con la nueva estructura
    const content = {
        NAME: name,
        TEXT: text
    };

    await saveFile(path, content);
    reloadBoard();
}

window.onload = () => {
    reloadall()
    reloadBoard()
};