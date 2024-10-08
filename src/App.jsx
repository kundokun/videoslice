import React, { useState, useEffect } from "react";
import { createFFmpeg, fetchFile } from "@ffmpeg/ffmpeg";

function App() {
  const [videoSrc, setVideoSrc] = useState(null);
  const [segments, setSegments] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [reversedVideo, setReversedVideo] = useState(null);

  const ffmpeg = createFFmpeg({
    log: true,
    corePath: "https://unpkg.com/@ffmpeg/core@0.8.3/dist/ffmpeg-core.js",
  });

  // Registrar el Service Worker cuando la app se cargue
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/coi-serviceworker.js").then(
        (registration) => {
          console.log(
            "Service Worker registrado con scope:",
            registration.scope
          );
        },
        (err) => {
          console.log("Error al registrar el Service Worker:", err);
        }
      );
    }
  }, []);

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      setVideoSrc(URL.createObjectURL(file));
      await processVideo(file);
    }
  };

  // Función para generar los segmentos
  const processVideo = async (file) => {
    setProcessing(true);

    if (!ffmpeg.isLoaded()) {
      await ffmpeg.load(); // Asegurarse de que FFmpeg está cargado antes de usarlo
    }

    ffmpeg.FS("writeFile", "input.mp4", await fetchFile(file));

    const segmentURLs = [];

    for (let i = 0; i < 5; i++) {
      const outputName = `segment${i}.mp4`;
      await ffmpeg.run(
        "-i",
        "input.mp4",
        "-ss",
        `${i}`,
        "-t",
        "1",
        "-c",
        "copy",
        outputName
      );

      const data = ffmpeg.FS("readFile", outputName);
      const videoBlob = new Blob([data.buffer], { type: "video/mp4" });
      const videoURL = URL.createObjectURL(videoBlob);

      segmentURLs.push(videoURL);
    }

    setSegments(segmentURLs);
    setProcessing(false);
  };

  // Función para unir los videos en orden inverso
  const concatenateVideosInReverse = async () => {
    if (!ffmpeg.isLoaded()) {
      await ffmpeg.load(); // Verificar que FFmpeg está cargado antes de la concatenación
    }

    // Aseguramos que FFmpeg haya terminado todas las operaciones anteriores
    await Promise.all(
      segments.map(async (segment, index) => {
        const outputName = `segment${index}.mp4`;
        await ffmpeg.FS("writeFile", outputName, await fetchFile(segment));
      })
    );

    // Generar el archivo de lista con los segmentos en orden inverso
    let concatList = "";
    for (let i = segments.length - 1; i >= 0; i--) {
      concatList += `file 'segment${i}.mp4'\n`; // Escribir en orden inverso
    }

    ffmpeg.FS("writeFile", "concat_list.txt", concatList);

    const outputVideo = "output_reversed.mp4";
    await ffmpeg.run(
      "-f",
      "concat",
      "-safe",
      "0",
      "-i",
      "concat_list.txt",
      "-c",
      "copy",
      outputVideo
    );

    const data = ffmpeg.FS("readFile", outputVideo);
    const videoBlob = new Blob([data.buffer], { type: "video/mp4" });
    const videoURL = URL.createObjectURL(videoBlob);

    return videoURL;
  };

  // Función que se activa cuando el botón de unir videos es presionado
  const handleConcatenation = async () => {
    const reversedVideoURL = await concatenateVideosInReverse();
    setReversedVideo(reversedVideoURL);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="p-8 max-w-lg bg-white rounded-xl shadow-lg border border-gray-200">
        <h1 className="text-4xl font-bold mb-4 text-lime-500">
          VideoSlice POC
        </h1>
        <p className="text-xl text-gray-600 mb-6">
          Sube un video y genera segmentos de 1 segundo.
        </p>

        <div className="space-y-4">
          <input
            type="file"
            className="w-full p-2 text-gray-700 bg-gray-50 border border-violet-500 rounded-md focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
            onChange={handleFileChange}
            accept="video/*"
          />
          {processing && <p>Procesando video...</p>}

          <div className="mt-4 space-y-4">
            {segments.map((segmentSrc, index) => (
              <div key={index}>
                <p>Segmento {index + 1}</p>
                <video src={segmentSrc} controls width="320" />
              </div>
            ))}
          </div>

          {segments.length > 0 && (
            <button
              onClick={handleConcatenation}
              className="bg-violet-600 text-white p-2 rounded"
            >
              Unir videos en orden inverso
            </button>
          )}

          {reversedVideo && (
            <div className="mt-6">
              <h2>Video en orden inverso</h2>
              <video src={reversedVideo} controls width="320" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
