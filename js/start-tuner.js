function startTuner() {
  const guitar = document.getElementById("guitar");
  const bureau = document.getElementById("bureau");
  const instruction = document.getElementById("instruction");
  const selectInput = document.getElementById("select-input");
  guitar.style.transition = "4s";
  guitar.style.transform = "translateX(-100vw)  translateY(-110%) ";
  bureau.style.transition = "3s";
  bureau.style.transform = "translateX(100vw)  translateY(-110%)";
  instruction.style.transition = "2s";
  instruction.style.transform = "translateY(-100vh) translateX(-50%)";
  selectInput.style.transition = "2s";
  selectInput.style.transform = "translateY(100vh) translateX(-50%)";
  setTimeout(() => {
    guitar.style.display = "none";
    bureau.style.display = "none";
    instruction.style.display = "none";
    selectInput.style.display = "none";
    startPitchDetect();
  }, 1500);
}
