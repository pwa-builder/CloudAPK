##TODO

- Por cada nuevo zip se debe crear una nueva carpeta que luego el alli se debera unzipear el projecto.
    - getcontents va a recibir el nombre del file como parametro y con eso se va a construir el path para el unzip.
- luego ese nombre de carpeta tiene que llegar hasta build.js y ahi la funcion graddleassemblerelease la debe tomar como variable       para la ruta donde se van a ejecutar los comandos
- hacer que se ejecuten las instrucciones de gradle en la carpeta recibida . (Mariano)
- luego de terminado el build, ver que se devuelva el apk en el response del post.
- borrar la carpeta con el projecto cuando se reciba el status 200 del post. 
- la apk se crea en The APK will be created on: /app/{projectFolder}/projects/Polyfills/android/source/app/build/outputs/apk/release/app-release-unsigned.apk