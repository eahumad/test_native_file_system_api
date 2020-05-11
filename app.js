"use strict"
let btnSeleccionarCarpeta = document.getElementById("btnSeleccionarCarpeta");
let dirHandle;
btnSeleccionarCarpeta.addEventListener('click', async (e) => {
  const opts = {type: 'open-directory'};
  dirHandle = await window.chooseFileSystemEntries(opts);
  processDirHandle();
});

async function processDirHandle () {
  document.getElementById('nombre_directorio').innerHTML = await dirHandle.name;
  document.getElementById('nombre_directorio2').innerHTML = await dirHandle.name;
  printDirectory();
  storeDirHandle();
}

async function printDirectory() {
  const entries = await dirHandle.getEntries();
  let ul = document.getElementById('archivos');
  ul.innerHTML = '';
  for await (const entry of entries) {
    const kind = entry.isFile ? 'Archivo' : 'Carpeta';
    let icon = document.createElement("span");
    icon.setAttribute('uk-icon', 'icon: '+(entry.isFile ?'file':'folder')  );
    let divider = document.createElement('div').setAttribute('class','uk-divider-vertical');
    let li = document.createElement("li");
    li.appendChild( icon );
    li.appendChild( document.createTextNode( entry.name ) ); 
    // li.appendChild( divider );
    ul.appendChild( li );
  }
}


let btnGrabarArchivoEnCarpeta = document.getElementById('btnGrabarArchivoEnCarpeta');
let fileHandle;
btnGrabarArchivoEnCarpeta.addEventListener('click', async(e) => {
  let nombreArchivo = document.getElementById('nombre_archivo').value;
  let textoArchivo = document.getElementById('texto_archivo').value;
  if( nombreArchivo ) {
    //Creará el archivo dentro de la carpeta elegida
    await verifyPermission(dirHandle, true);
    fileHandle = await dirHandle.getFile( nombreArchivo, {create: true});
    
    //Se crea el stream para escribir en el archivo
    const writable = await fileHandle.createWritable(); //desde chrome 82 createWriter fue reemplazada por createWritable() https://wicg.github.io/native-file-system/#dom-filesystemfilehandle-createwritable
    await console.log(writable); 

    // // //Se escribe el texto del textarea dentro del archivo
     await writable.write( {type:"write", data:textoArchivo} );
    // let arg1= 'writer';
    // await writable.write( arg1, textoArchivo );

    // // //Se cierra el archivo y se escriben losc ambios en el disco
    await writable.close();
    processDirHandle();
  } else {
    alert('Debe Ingresar el nombre del archivo');
  }
});





async function verifyPermission(fileHandle, withWrite) {
  const opts = {};
  if (withWrite) {
    opts.writable = true;
  }
  // Check if we already have permission, if so, return true.
  if (await fileHandle.queryPermission(opts) === 'granted') {
    return true;
  }
  // Request permission, if the user grants permission, return true.
  if (await fileHandle.requestPermission(opts) === 'granted') {
    return true;
  }
  // The user did nt grant permission, return false.
  return false;
}


function storeDirHandle() {
  let transaction = db.transaction(["dirHandlers"],"readwrite");
  let store = transaction.objectStore("dirHandlers");
  store.clear(); //se limpia el store
  let request = store.add(dirHandle,1);

  request.onerror = function(e) {
    console.log("Error",e.target.error.name);
    //some type of error handler
  }

  request.onsuccess = function(e) {
    console.log("dirHandle almacenado");
  }
}

async function getDirHandleFromIndexedDB() {
  var transaction = db.transaction(["dirHandlers"],"readonly");
  var store = transaction.objectStore("dirHandlers");
  var request = store.get(Number(1));

  request.onsuccess = function(e) {
    var result = e.target.result;
    if(result) {
      dirHandle = result;
      processDirHandle();
    } else {
      console.log('No se pudo acceder al dirHandle almacenado');
    }   
  }   

}


//Cargar carpeta al inicio
var openRequest;
var db;
document.addEventListener('DOMContentLoaded', function() {

  openRequest = indexedDB.open('native_file_api', 1);

  openRequest.onupgradeneeded = function(e) {
    console.log("Actualizando native_file_api_db");
    var thisDB = e.target.result;
    if(!thisDB.objectStoreNames.contains("dirHandlers")) {
      thisDB.createObjectStore("dirHandlers");
    }
  }

  openRequest.onsuccess = function(e) {
    console.log("Operación exitosa");
    db = e.target.result;
    getDirHandleFromIndexedDB();
  }

  openRequest.onerror = function(e) {
    console.log("error al conectar");
    console.dir(e);
  }
}, false);