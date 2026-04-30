let d3 = require("d3");
let THREE = require("three");
let Visualization = require("./Visualization.js");

/**
 * @class
 * @description 3D bar chart with Perspective Scale Break (PSB) for outlier inspection.
 */
class PerspectiveScaleBreakBarChart extends Visualization {
  constructor(parentElement, settings) {
    super(parentElement, settings);
    this.name = "PerspectiveScaleBreakBarChart";
    this.renderer = null;
    this.scene = null;
    this.camera = null;
    this.chartGroup = null;
    this.bars = [];
    this.animationFrame = null;
    this.material = null;
    this.isDragging = false;
    this.lastPointer = null;

    this.svg.style("display", "none");

    this.webglContainer = d3
      .select(this.parentElement)
      .append("div")
      .attr("class", "psb-webgl-container")
      .style("width", "100%")
      .style("height", "100%")
      .style("overflow", "hidden")
      .node();
  }

  _putDefaultSettings() {
    this.settings.width = 900;
    this.settings.height = 500;
    this.settings.color = 0x457b9d;
    this.settings.backgroundColor = 0xf8f9fa;
    this.settings.labelKey = "label";
    this.settings.valueKey = "value";
    this.settings.maxBarHeight = 6;
    this.settings.centerY = 3;
    this.settings.barWidth = 1.2;
    this.settings.barDepth = 0.8;
    this.settings.barGap = 0.5;
    this.settings.cameraViewSize = 8.5;
    this.settings.cameraNear = 0.1;
    this.settings.cameraFar = 100;
    this.settings.cameraX = 0;
    this.settings.cameraY = 0;
    this.settings.cameraZ = 20;
    this.settings.breakStart = 3.2;
    this.settings.breakEnd = 5.2;
    this.settings.foldVisualHeight = 1.4;
    this.settings.depth = 8;
    this.settings.minDepth = 0;
    this.settings.maxDepth = 8;
    this.settings.outlierRatioThreshold = 3;
    this.settings.smallBarsTargetHeight = 5.5;
    this.settings.enableRotation = true;
    this.settings.rotationSpeed = 0.01;
    this.settings.baseOffsetY = 1.5;
  }

  data(d) {
    super.data(d);
    this.valueKey = this.settings.valueKey;
    this.labelKey = this.settings.labelKey;
    this.yScale = d3
      .scaleLinear()
      .domain([0, d3.max(this.d, (item) => +item[this.valueKey])])
      .range([0, this.settings.maxBarHeight]);
    this._calculateOutlierInfo();
    this.redraw();
    return this;
  }

  resize() {
    super.resize();
    let bounds = this.parentElement.getBoundingClientRect();
    this.settings.width =
      this.settings.size_type === "fit" ? bounds.width : this.settings.width;
    this.settings.height =
      this.settings.size_type === "fit" ? bounds.height : this.settings.height;

    if (this.renderer && this.camera) {
      this.renderer.setSize(this.settings.width, this.settings.height);
      this._updateCamera();
    }
    return this;
  }

  redraw() {
    if (!this.hasData) return this;
    if (!this.scene) this._createScene();
    this._renderBars(this.settings.depth);
    return super.redraw();
  }

  updateDepth(depth) {
    this.settings.depth = Math.max(
      this.settings.minDepth,
      Math.min(this.settings.maxDepth, depth),
    );
    this._renderBars(this.settings.depth);
    return this;
  }

  destroy() {
    if (this.animationFrame) cancelAnimationFrame(this.animationFrame);
    if (this.renderer) this.renderer.dispose();
    this.webglContainer.innerHTML = "";
    return this;
  }

  _calculateOutlierInfo() {
    let values = this.d.map((item) => +item[this.valueKey]);
    let maxValue = Math.max(...values);
    let sortedValues = [...values].sort((a, b) => b - a);
    let secondMaxValue = sortedValues[1] || maxValue;
    this.maxValue = maxValue;
    this.outlierRatio = maxValue / secondMaxValue;
    this.hasOutlier = this.outlierRatio >= this.settings.outlierRatioThreshold;
    let nonOutliers = values.filter((v) => v !== maxValue);
    this.maxNonOutlier = Math.max(...nonOutliers);
    this.minNonOutlier = Math.min(...nonOutliers);
  }

  _createScene() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(this.settings.backgroundColor);
    this._updateCamera(true);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(this.settings.width, this.settings.height);
    this.webglContainer.innerHTML = "";
    this.webglContainer.appendChild(this.renderer.domElement);

    this.chartGroup = new THREE.Group();
    this.scene.add(this.chartGroup);
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.8));

    let light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(5, 10, 10);
    this.scene.add(light);

    // com efeito 3d
    // this.material = new THREE.MeshStandardMaterial({ color: this.settings.color });

    // sem efeito 3d
    this.material = new THREE.MeshBasicMaterial({
      color: this.settings.color,
    });

    if (this.settings.enableRotation) this._bindRotationEvents();
    this._animate();
  }

  _updateCamera(createNew) {
    let aspect = this.settings.width / this.settings.height;
    let spacing = this.settings.barWidth + this.settings.barGap;
    let chartWidth = this.d ? this.d.length * spacing : 1;
    let verticalView = this.settings.maxBarHeight + 2;
    let horizontalView = chartWidth / aspect + 2;
    let viewSize = Math.max(
      this.settings.cameraViewSize,
      verticalView,
      horizontalView,
    );

    if (createNew || !this.camera) {
      this.camera = new THREE.OrthographicCamera(
        -viewSize * aspect,
        viewSize * aspect,
        viewSize,
        -2.5,
        this.settings.cameraNear,
        this.settings.cameraFar,
      );
      this.camera.position.set(
        this.settings.cameraX,
        this.settings.cameraY,
        this.settings.cameraZ,
      );
      this.camera.lookAt(0, this.settings.centerY, 0);
    } else {
      this.camera.left = -viewSize * aspect;
      this.camera.right = viewSize * aspect;
      this.camera.top = viewSize;
      this.camera.bottom = -2.5;
      this.camera.updateProjectionMatrix();
    }
  }

  _getVisualHeight(d, depth) {
    let value = +d[this.valueKey];
    let normalHeight = this.yScale(value);
    if (!this.hasOutlier) return normalHeight;
    if (value === this.maxValue) return normalHeight;

    let normalizedDepth = depth / this.settings.maxDepth;
    let t =
      (value - this.minNonOutlier) /
      (this.maxNonOutlier - this.minNonOutlier || 1);
    let minVisual = this.settings.breakStart * 0.25;
    let maxVisual = this.settings.smallBarsTargetHeight;
    let expandedHeight = minVisual + t * (maxVisual - minVisual);
    return THREE.MathUtils.lerp(normalHeight, expandedHeight, normalizedDepth);
  }

  _clearBars() {
    this.bars.forEach((bar) => this.chartGroup.remove(bar));
    this.bars = [];
  }

  _renderBars(depth) {
    this._clearBars();
    let spacing = this.settings.barWidth + this.settings.barGap;

    this.d.forEach((d, i) => {
      let totalHeight = this._getVisualHeight(d, depth);
      let x = i * spacing - ((this.d.length - 1) * spacing) / 2;
      let value = +d[this.valueKey];
      let bar =
        this.hasOutlier && value === this.maxValue
          ? this._createFoldedBar(x, totalHeight, depth)
          : this._createNormalBar(x, totalHeight);

      bar.userData = { datum: d, index: i };
      this.chartGroup.add(bar);
      this.bars.push(bar);

      // label embaixo da barra
      let label = this._createTextSprite(d[this.labelKey]);
      label.position.set(x, this.settings.baseOffsetY - 0.3, 0);
      this.chartGroup.add(label);
      this.bars.push(label);
    });
  }

  _createNormalBar(x, height) {
    let mesh = new THREE.Mesh(
      new THREE.BoxGeometry(
        this.settings.barWidth,
        height,
        this.settings.barDepth,
      ),
      this.material,
    );
    mesh.position.set(x, height / 2 + this.settings.baseOffsetY, 0);
    return mesh;
  }

  _createFoldedBar(x, totalHeight, depth) {
    let group = new THREE.Group();
    group.position.set(x, this.settings.baseOffsetY, 0);

    if (depth <= 0 || totalHeight <= this.settings.breakEnd) {
      let mesh = new THREE.Mesh(
        new THREE.BoxGeometry(
          this.settings.barWidth,
          totalHeight,
          this.settings.barDepth,
        ),
        this.material,
      );

      mesh.position.set(0, totalHeight / 2, 0);

      group.add(mesh);
      return group;
    }

    let upperHeight = Math.max(
      0.1,
      totalHeight - this.settings.breakStart - this.settings.foldVisualHeight,
    );
    let y0 = 0;
    let y1 = this.settings.breakStart;
    let y2 = this.settings.breakStart + this.settings.foldVisualHeight * 0.35;
    let y3 = this.settings.breakStart + this.settings.foldVisualHeight * 0.65;
    let y4 = this.settings.breakStart + this.settings.foldVisualHeight;
    let y5 = y4 + upperHeight;

    let points = [
      { y: y0, z: 0 },
      { y: y1, z: 0 },
      { y: y2, z: -depth },
      { y: y3, z: -depth },
      { y: y4, z: 0 },
      { y: y5, z: 0 },
    ];

    let geometry = this._createPrismFromYZProfile(
      points,
      this.settings.barWidth,
      this.settings.barDepth,
    );
    group.add(new THREE.Mesh(geometry, this.material));
    return group;
  }

  _createPrismFromYZProfile(points, width, thickness) {
    let vertices = [];
    let indices = [];
    let xLeft = -width / 2;
    let xRight = width / 2;
    let zOffsetFront = thickness / 2;
    let zOffsetBack = -thickness / 2;

    points.forEach((p) => {
      vertices.push(xLeft, p.y, p.z + zOffsetFront);
      vertices.push(xRight, p.y, p.z + zOffsetFront);
      vertices.push(xLeft, p.y, p.z + zOffsetBack);
      vertices.push(xRight, p.y, p.z + zOffsetBack);
    });

    for (let i = 0; i < points.length - 1; i++) {
      let a = i * 4;
      let b = (i + 1) * 4;
      indices.push(a, b, a + 1, a + 1, b, b + 1);
      indices.push(a + 2, a + 3, b + 2, a + 3, b + 3, b + 2);
      indices.push(a, a + 2, b, a + 2, b + 2, b);
      indices.push(a + 1, b + 1, a + 3, a + 3, b + 1, b + 3);
    }

    indices.push(0, 1, 2, 1, 3, 2);
    let last = (points.length - 1) * 4;
    indices.push(last, last + 2, last + 1, last + 1, last + 2, last + 3);

    let geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(vertices, 3),
    );
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    return geometry;
  }

  _createTextSprite(text) {
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 128;

    const context = canvas.getContext("2d");
    context.font = "48px Arial";
    context.fillStyle = "#333";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(text, canvas.width / 2, canvas.height / 2);

    const texture = new THREE.CanvasTexture(canvas);

    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: false,
      depthWrite: false,
    });

    const sprite = new THREE.Sprite(material);
    sprite.scale.set(1.2, 0.6, 1);

    return sprite;
  }

  _bindRotationEvents() {
    let canvas = this.renderer.domElement;
    canvas.addEventListener("pointerdown", (e) => {
      this.isDragging = true;
      this.lastPointer = { x: e.clientX, y: e.clientY };
    });
    window.addEventListener("pointerup", () => {
      this.isDragging = false;
      this.lastPointer = null;
    });
    canvas.addEventListener("pointermove", (e) => {
      if (!this.isDragging || !this.lastPointer) return;
      let dx = e.clientX - this.lastPointer.x;
      let dy = e.clientY - this.lastPointer.y;
      this.chartGroup.rotation.y += dx * this.settings.rotationSpeed;
      this.chartGroup.rotation.x += dy * this.settings.rotationSpeed;
      this.lastPointer = { x: e.clientX, y: e.clientY };
    });
  }

  _animate() {
    this.renderer.render(this.scene, this.camera);
    this.animationFrame = requestAnimationFrame(() => this._animate());
  }
}

module.exports = PerspectiveScaleBreakBarChart;
