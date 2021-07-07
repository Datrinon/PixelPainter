"use strict"

//#region Constants
const sketchboard = document.querySelector("#sketchboard");
const sizeSlider = document.querySelector("#grid-size-controller");
const sizeSliderIndicator = document.querySelector("#grid-size");
const sizeSliderOptions = document.querySelector("#grid-size-options");

let gridSize;
let foregroundColor = "#000000";
let clickHeldDown = false;
let eraserOn = false;
let eyedropperOn = false;
let rainbowModeOn = false;
let rainbowHue = 0;

/**
 * Draws a grid. 
 * @param coloredCells - (Default: []) 
 * An optional parameter containing an array of coordinates the user drew at. 
 * For use when the user resizes the grid to restore their drawing.
 */
function drawGrid(coloredCells = []) {

    // reset grid
    while(sketchboard.firstChild) {
        sketchboard.removeChild(sketchboard.firstChild);
    }

    for (let i = 0; i < gridSize; i++) {
        for (let j = 0; j < gridSize; j++) {
            let gridBoxCell = document.createElement("div");
            gridBoxCell.classList.add("grid-cell");
            // gridBoxCell.textContent = "x"; //*debug
            gridBoxCell.addEventListener("mousemove", applyTool);
            gridBoxCell.addEventListener("mousedown", applyTool);


            for (let cell of coloredCells){
                if (i == cell[0] && j == cell[1]) {
                    // console.log("hit");
                    gridBoxCell.classList.add("colored");
                    if (cell[2] != null) {
                        gridBoxCell.style.backgroundColor = cell[2];
                    }
                    coloredCells.shift(); // remove colored cell first.
                    break; // end loop. 
                }
            }

            sketchboard.appendChild(gridBoxCell);
        }
    }
}

/**
 * Determines which tool to apply to the cell, depending on which tool was selected.
 * Meant to be a callback function when the user presses mouse over a cell.
 */
function applyTool(e) {
    if(clickHeldDown || e.type === "mousedown") {
        if (eyedropperOn) {
            foregroundColor = e.target.style.backgroundColor;
            if (foregroundColor.includes("hsl")) {
                foregroundColor = hslToHex(foregroundColor); // convert hsl to hex. thanks to id7126 on stkoverflow.
            } else if (foregroundColor.includes("rgb")) {
                foregroundColor = rgbToHex(foregroundColor); // convert rgb to hex. thanks to Gerrit0 on stkoverflow.
            } else {
                foregroundColor = "#FFFFFF";
            }
            document.querySelector("#color-picker").value = foregroundColor;   
        }
        else if (eraserOn){
            e.target.classList.remove("colored");
            e.target.style.backgroundColor = "";
        } else {
            e.target.classList.add("colored");
            if (rainbowModeOn) {
                rainbowHue = rainbowHue <= 360 ? ++rainbowHue : 0;
                e.target.style.backgroundColor = `hsl(${rainbowHue}, 100%, 50%)`;
            } else {
                e.target.style.backgroundColor = foregroundColor;
            }
        }
    }
}

/** 
 * Updates the grid size text on the view when the slider is adjusted.
 * A callback which is used when the slider's value changes.
 */ 
function updateGridSizeView(e) {
    //console.log(e.target);
    sizeSliderIndicator.textContent = e.target.value;
    if (+gridSize !== +sizeSliderIndicator.textContent) {
        sizeSliderOptions.classList.remove("disabled");
    } else {
        sizeSliderOptions.classList.add("disabled");
    }
}

/**
 * Searches the grid for all colored cells and stores them into an array of tuples 
 * possessing their coordinates and color in RGB() format.
 * @returns 
 */
function getColoredCells() {
    // get the coordinates of the old classes.
    let cells = Array.from(sketchboard.querySelectorAll("div.grid-cell"));
    let coloredCells = [];

    // to save the current drawing; will attempt to restore it in drawGrid()
    for (let cell of cells) {
        if (cell.classList.contains("colored")){
            let index = cells.indexOf(cell);
            let row = Math.floor(index / gridSize);
            let col = index - (row * gridSize);
            let bgColor = cell.style.backgroundColor == "" ? null : cell.style.backgroundColor;
            // console.log(bgColor); //debug
            coloredCells.push([row, col, bgColor])
        }
    }

    return coloredCells;

}

function resizeGrid() {

    let coloredCells = getColoredCells();

    // start resetting here
    sizeSliderIndicator.textContent = sizeSlider.value;
    sizeSliderOptions.classList.add("disabled");

    // prepare the new grid size
    gridSize = sizeSlider.value;
    sketchboard.style.gridTemplateColumns = `repeat(${gridSize}, 0.8em)`;
    sketchboard.style.gridTemplateRows = `repeat(${gridSize}, 0.8em)`;

    drawGrid(coloredCells);
}


function selectTool(e) {

    let allBtns = document.querySelectorAll(".tool");
    let brushBtn = document.querySelector("#brush");
    let eraserBtn = document.querySelector("#eraser");
    let eyedropperBtn = document.querySelector("#eyedropper");
    let selectedBtn;
    let keyCode;

    // Determine whether the user pressed a keyboard button or used their mouse.
    if (e.type !== "click") {
        keyCode = e.keyCode;
        selectedBtn = document.querySelector(`#toolbar button[data-key="${keyCode}"]`);
        // no valid button returned? return early.
        if (selectedBtn == null) { return; }
    } else {
        selectedBtn = e.target;
    }

    // remove disabled from all before applying disabled to the selected.
    allBtns.forEach(btn => btn.removeAttribute("disabled")); 
    selectedBtn.setAttribute("disabled", ""); // toggle mode on.

    switch(selectedBtn) {
        case brushBtn:
            eraserOn = false;
            eyedropperOn = false;
            break;
        case eraserBtn:
            eraserOn = true;
            eyedropperOn = false;
            break;
        case eyedropperBtn:
            eraserOn = false;
            eyedropperOn = true;
            break;
    }
}

function resetGrid() {
    let answer = confirm("Are you sure you want to erase the entire grid?");
    if (answer) {
        drawGrid();
    }

}

function toggleRainbowMode(e) {
    e.target.classList.toggle("button-toggle");
    rainbowModeOn = !rainbowModeOn;
}

function toggleGrid() {
    sketchboard.querySelectorAll(".grid-cell").forEach(cell => cell.classList.toggle("grid-cell-disable"));
}

function pickColor(e) {
    foregroundColor = this.value;
}

function saveSession() {
    let coloredCells = getColoredCells();
    // need to save 1) colors and 2) grid size.
    // we use local storage rather than cookies (latter is for server-side).
    localStorage.setItem("coloredCells", JSON.stringify(coloredCells));
    localStorage.setItem("gridSize", gridSize);
    
    document.querySelector("#save-msg").classList.add("save-successful");
    document.querySelector("#save-msg").addEventListener("animationend", (e) => {
        document.querySelector("#save-msg").classList.remove("save-successful")
    });
}

/**
 * Drives the program. Adds event listeners for the relevant elements, and restores
 * any data from the user's previous session.
 */
function main() {
    // detect if mouse button is held down with these event listeners.
    // for use with brush.
    //* Debug Note: Put these brackets around to solve issue with resetting. Weird.
    document.onmousedown = (e) => {
        clickHeldDown = true;
    }
    document.onmouseup = (e) => { 
        clickHeldDown = false;
    }
    
    if (localStorage.getItem("gridSize") != null) {
        gridSize = +localStorage.getItem("gridSize");
        sizeSliderIndicator.textContent = gridSize;
    } else {
        gridSize = +sizeSlider.value;
        sizeSliderIndicator.textContent = gridSize;
    }
    console.log(gridSize);

    if (localStorage.getItem("coloredCells") != null){
        let coloredCells = JSON.parse(localStorage.getItem("coloredCells"));
        // console.log(coloredCells);
        drawGrid(coloredCells);
    } else {
        drawGrid();
    }

    // some browsers maintain the input value, inject column and row sizes here to prevent issues.
    sketchboard.style.gridTemplateColumns = `repeat(${gridSize}, 0.8em)`;
    sketchboard.style.gridTemplateRows = `repeat(${gridSize}, 0.8em)`;


    //#region HTML Element Event Listener Initialization
    // brush, eraser, rainbow mode, and reset button
    document.querySelector("#color-picker").addEventListener("input", pickColor);
    document.querySelector("#eyedropper").addEventListener("click", selectTool);
    document.querySelector("#eraser").addEventListener("click", selectTool);
    document.querySelector("#brush").addEventListener("click", selectTool);

    // misc. options
    document.querySelector("#hide-grid").addEventListener("click", toggleGrid);
    document.querySelector("#rainbow-mode").addEventListener("click", toggleRainbowMode);
    document.querySelector("#reset").addEventListener("click", resetGrid);
    
    // kbd options.
    window.addEventListener('keydown', selectTool);

    // grid resizer
    sizeSlider.addEventListener("input", updateGridSizeView);
    document.querySelector("#ok").addEventListener("click", resizeGrid);
    document.querySelector("#revert").addEventListener("click", (e) => {
        sizeSlider.value = gridSize;
        sizeSliderOptions.classList.add("disabled");
        sizeSliderIndicator.textContent = gridSize;
    });
    
    //save
    document.querySelector("#save").addEventListener("click", saveSession);
    window.onbeforeunload = () => saveSession();
    //#endregion
}

main();