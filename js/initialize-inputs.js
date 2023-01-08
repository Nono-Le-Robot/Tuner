navigator.mediaDevices
  .getUserMedia({
    audio: {},
  })
  .then(() => {
    navigator.mediaDevices.enumerateDevices().then(function (deviceInfos) {
      // Récupération de la liste déroulante
      var select = document.getElementById("input-device-select");

      // Ajout des options à la liste déroulante
      for (var i = 0; i !== deviceInfos.length; ++i) {
        var deviceInfo = deviceInfos[i];
        if (deviceInfo.kind === "audioinput") {
          var option = document.createElement("option");
          option.classList.add("secondary-input");
          option.value = deviceInfo.deviceId;
          option.text =
            deviceInfo.label.slice(0, 65) + "..." ||
            "Périphérique d'entrée audio " + (i + 1);
          select.appendChild(option);
        }
      }
    });
  });
