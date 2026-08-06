(function () {
  "use strict";

  var value = 0;
  var display = document.getElementById("counter-value");

  function render() {
    display.textContent = String(value);
  }

  document.getElementById("increment").addEventListener("click", function () {
    value += 1;
    render();
  });

  document.getElementById("decrement").addEventListener("click", function () {
    value -= 1;
    render();
  });

  document.getElementById("reset").addEventListener("click", function () {
    value = 0;
    render();
  });

  render();
})();
