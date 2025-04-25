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

function encodeimg(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        // Cuando el archivo ha sido leído correctamente
        reader.onloadend = () => {
            // La propiedad result contiene el contenido Base64
            resolve(reader.result); 
        };
        
        // Si hay algún error al leer el archivo
        reader.onerror = reject;

        // Leemos el archivo como Data URL (Base64)
        reader.readAsDataURL(file);
    });
}


function descodeimg(list) {
    return list.map(base64Str => {
        // Convertir Base64 a binario
        const byteCharacters = atob(base64Str.split(',')[1]);  // Ignorar el prefijo de tipo de imagen (data:image/png;base64,...)
        const byteArrays = new Uint8Array(byteCharacters.length);
        
        // Llenar el Uint8Array con los valores de los bytes
        for (let i = 0; i < byteCharacters.length; i++) {
            byteArrays[i] = byteCharacters.charCodeAt(i);
        }
        
        // Crear un Blob con los bytes para la imagen
        return new Blob([byteArrays], { type: 'image/png' });  // Asegúrate de usar el tipo correcto
    });
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
            const img = postData["IMG"];  // La imagen en base64 o URL

            // Si hay imagen, crea el HTML para mostrarla
            let imgh = '';
            if (img) {
                imgh = `<img src="${img}" alt="Imagen" style="max-width: 200px; max-height: 200px; margin-bottom: 10px;">`;
            }

            document.getElementById("BARR").innerHTML += `
            <button onclick="post(0,${i})">#</button>
            <span>${postData["NAME"]}: ${postData["TEXT"]}</span><br>
                ${imgh}
            `;

            // Leer subposts
            const subPostDir = `${postPath}/SP`;  // Cambié esta línea para que sea directamente el directorio del post
            let long = 0;
            try {
                const sdirs = await getDirs(subPostDir);
                long = sdirs.length;
            } catch (error) {
                long = 0;  // Lo dejas en 0 si ocurre un error
            }

            for (let j = 0; j < long; j++) {
                const subHexId = j.toString(16).toUpperCase().padStart(4, '0');
                const subPostFile = `${subPostDir}/${subHexId}S.json`;  // Asegúrate de que el archivo correcto esté en la ruta

                try {
                    const subPostData = await readdoc(subPostFile);
                    // Mostrar los subposts
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
        document.getElementById("BARR").innerHTML += `<input type="file" id="file" accept=".jpg, .jpeg, .bmp, .png, .gif"><br>`;
        document.getElementById("BARR").innerHTML += `<button onclick='postpost()'>OK</button>`;
    } else {
        document.getElementById("BARR").innerHTML += `<button onclick='postsubpost(${id})'>OK</button>`;
    }
}
async function postpost() {
    const name = document.getElementById("postName").value.trim();
    const text = document.getElementById("postText").value.trim();
    const fileInput = document.getElementById("file");  // input de tipo file

    if (!name || !text) return alert("Nombre y texto requeridos");

    const dirs = await getDirs(board);
    const id = dirs.length;
    const hexId = id.toString(16).toUpperCase().padStart(8, '0');
    const path = `${board}/${hexId}P/POST.json`;

    // Creamos el contenido del post
    const content = {
        NAME: name,
        TEXT: text,
        IMG: fileInput.files.length > 0 ? await encodeimg(fileInput.files[0]) : null  // Convertir imagen a Base64 si existe
    };

    // Guardar el JSON con la imagen en Base64
    await saveFile(path, content);

    // Si no deseas subir la imagen como archivo, sino solo guardar el Base64, no es necesario hacer más
    reloadBoard();
}

async function postsubpost(postid) {
    const name = document.getElementById("postName").value.trim();
    const text = document.getElementById("postText").value.trim();
    if (!name || !text) return alert("Nombre y texto requeridos");

    const id = postid;
    const hexId = id.toString(16).toUpperCase().padStart(8, '0');
    const postpath = `${board}/${hexId}P/SP`;
    // hijo de puta como em a costado areglar esto
    let sid = 0;  // Valor por defecto
    try {
        const sdirs = await getDirs(postpath);
        sid = sdirs.length;
    } catch (error) {
        console.error("Error al obtener los directorios:", error);
        sid = 0;  // Lo dejas en 0 si ocurre un error
    }
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