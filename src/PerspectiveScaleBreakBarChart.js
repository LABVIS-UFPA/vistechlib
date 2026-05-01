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
    // Dimensões e aparência
    this.settings.width = 900;
    this.settings.height = 500;
    this.settings.color = 0x457b9d;
    this.settings.backgroundColor = 0xf8f9fa;

    // Dados
    this.settings.labelKey = "label";
    this.settings.valueKey = "value";

    // Escala e geometria das barras
    this.settings.maxBarHeight = 6;
    this.settings.centerY = 3;
    this.settings.barWidth = 1.2;
    this.settings.barDepth = 0.8;
    this.settings.barGap = 0.5;

    /*
     * Configuração da câmera perspectiva.
     *
     * Em vez de definir cameraZ manualmente, a distância da câmera
     * será calculada com base no FOV, na razão de aspecto da tela
     * e nas dimensões aproximadas do gráfico.
     *
     * Isso evita uma escolha empírica da posição da câmera 
     */
    this.settings.cameraNear = 0.1;
    this.settings.cameraFar = 1000;
    this.settings.cameraX = 0;
    this.settings.cameraY = null;
    this.settings.cameraZ = null;
    this.settings.cameraFov = 20;
    this.settings.cameraMargin = 1.25;

    // Scale Break
    this.settings.breakStart = 3.2;
    this.settings.breakEnd = 5.2;
    this.settings.foldVisualHeight = 1.4;

    // Profundidade do efeito 3D aplicado ao outlier
    this.settings.depth = 8;
    this.settings.minDepth = 0;
    this.settings.maxDepth = 8;

    // Detecção de outlier
    this.settings.outlierRatioThreshold = 3;

    // Ajuste visual das barras menores quando há outlier
    this.settings.smallBarsTargetHeight = 5.5;

    // Interação
    this.settings.enableRotation = true;
    this.settings.rotationSpeed = 0.01;

    // Offset vertical
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

    /*
     * A câmera é criada antes dos objetos porque sua configuração depende
     * apenas das dimensões estimadas do gráfico e dos parâmetros de projeção.
     */
    this._updateCamera(true);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(this.settings.width, this.settings.height);

    this.webglContainer.innerHTML = "";
    this.webglContainer.appendChild(this.renderer.domElement);

    this.chartGroup = new THREE.Group();
    this.chartGroup.rotation.set(0, 0, 0);
    this.scene.add(this.chartGroup);

    this.scene.add(new THREE.AmbientLight(0xffffff, 0.8));

    let light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(5, 10, 10);
    this.scene.add(light);

    /*
     * MeshBasicMaterial remove variações de iluminação.
     * Isso pode ser útil academicamente porque evita que sombras e brilho
     * interfiram na percepção da altura das barras.
     */
    this.material = new THREE.MeshBasicMaterial({
      color: this.settings.color,
    });

    if (this.settings.enableRotation) this._bindRotationEvents();

    this._animate();
  }

  _updateCamera(createNew) {
    const aspect = this.settings.width / this.settings.height;
    const { chartWidth, chartHeight } = this._getChartBounds();

    /*
     * A PerspectiveCamera do Three.js usa FOV vertical.
     *
     * Relação geométrica:
     *
     * visibleHeight = 2 * distance * tan(fov / 2)
     *
     * Logo, a distância necessária para enquadrar o gráfico pode ser
     * calculada a partir da altura/largura do objeto e do FOV.
     *
     * Essa escolha substitui um cameraZ fixo por uma câmera calibrada.
     */
    const cameraDistance = this._calculatePerspectiveDistance(
      chartWidth,
      chartHeight,
      this.settings.cameraFov,
      aspect,
    );

    const finalCameraZ =
      this.settings.cameraZ ?? cameraDistance * this.settings.cameraMargin;

    /*
     * Para a visão frontal calibrada, a câmera deve olhar para o centro
     * vertical do gráfico. Se cameraY não for informado, usa-se centerY.
     */
    const cameraTargetY = this.settings.centerY;
    const cameraY = this.settings.cameraY ?? cameraTargetY;

    if (createNew || !this.camera) {
      this.camera = new THREE.PerspectiveCamera(
        this.settings.cameraFov,
        aspect,
        this.settings.cameraNear,
        this.settings.cameraFar,
      );
    }

    this.camera.aspect = aspect;
    this.camera.fov = this.settings.cameraFov;
    this.camera.near = this.settings.cameraNear;
    this.camera.far = this.settings.cameraFar;

    this.camera.position.set(
      this.settings.cameraX,
      cameraY,
      finalCameraZ,
    );

    this.camera.lookAt(0, cameraTargetY, 0);

    /*
     * Sempre que FOV, aspect, near ou far mudam, a matriz de projeção
     * precisa ser atualizada para que o Three.js recalcule a projeção.
     */
    this.camera.updateProjectionMatrix();
  }

  _getChartBounds() {
    const spacing = this.settings.barWidth + this.settings.barGap;

    /*
     * Estimativa da largura total do gráfico no espaço 3D.
     * Serve para calcular a distância mínima da câmera.
     */
    const chartWidth = this.d ? this.d.length * spacing : spacing;

    /*
     * Estimativa da altura total visível do gráfico.
     * Inclui altura máxima, deslocamento da base e a região visual da dobra.
     */
    const chartHeight =
      this.settings.baseOffsetY +
      this.settings.maxBarHeight +
      this.settings.foldVisualHeight +
      1;

    return { chartWidth, chartHeight };
  }

  _calculatePerspectiveDistance(objectWidth, objectHeight, fovDeg, aspect) {
    const verticalFov = THREE.MathUtils.degToRad(fovDeg);

    const distanceByHeight =
      objectHeight / (2 * Math.tan(verticalFov / 2));

    /*
     * Como o FOV informado ao Three.js é vertical, calculamos o FOV horizontal
     * equivalente para garantir que a largura do gráfico também caiba na tela.
     */
    const horizontalFov =
      2 * Math.atan(Math.tan(verticalFov / 2) * aspect);

    const distanceByWidth =
      objectWidth / (2 * Math.tan(horizontalFov / 2));

    return Math.max(distanceByHeight, distanceByWidth);
  }

  resetView() {
    /*
     * Retorna a visualização para a visão frontal calibrada.
     * Isso separa a posição de referência da exploração interativa.
     */
    if (this.chartGroup) {
      this.chartGroup.rotation.set(0, 0, 0);
    }

    this._updateCamera();

    return this;
  }

  _getVisualHeight(d, depth) {
    let value = +d[this.valueKey];
    let normalHeight = this.yScale(value);

    if (!this.hasOutlier) return normalHeight;
    if (value === this.maxValue) return normalHeight;

    /*
     * Esta função introduz uma distorção visual controlada:
     * as barras não-outliers podem ser expandidas visualmente quando há
     * um outlier dominante.
     *
     * Isso deve ser descrito como um trade-off:
     * melhora-se a legibilidade dos valores menores, mas a altura deixa
     * de ser estritamente proporcional ao valor real.
     */
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

    /*
     * A barra outlier é representada como um prisma definido por um perfil YZ.
     * A dobra desloca parte da barra no eixo Z, criando a percepção de
     * profundidade associada ao scale break.
     */
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