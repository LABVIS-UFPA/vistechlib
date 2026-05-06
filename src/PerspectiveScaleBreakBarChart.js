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
    this.yAxisGroup = null;
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
    this.settings.barDepth = 0;
    this.settings.barGap = 0.5;

    // Eixo Y e linhas guias
    this.settings.showPerspectiveYAxis = true;
    this.settings.yAxisTicks = 20;
    this.settings.yAxisColor = 0x333333;
    this.settings.yGridColor = 0xcfcfcf;
    this.settings.yAxisOffsetX = 0.9;
    this.settings.yAxisStep = 3;

    // Zoom
    this.settings.enableZoom = true;
    this.settings.zoomSpeed = 0.08;
    this.settings.minCameraDistance = 4;
    this.settings.maxCameraDistance = 40;

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
    this.settings.cameraFov = 45;
    this.settings.cameraMargin = 1.25;
    this.settings.cameraMode = "perspective";

    // Scale Break
    this.settings.breakStart = 3.2;
    this.settings.breakEnd = 5.2;
    this.settings.foldVisualHeight = 1.4;

    // Profundidade do efeito 3D aplicado ao outlier
    this.settings.depth = 8;
    this.settings.minDepth = 0;
    this.settings.maxDepth = 16;

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
      this._updateConfiguredCamera();
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

  setCameraMode(cameraMode) {
    const nextCameraMode =
      cameraMode === "orthographic" ? "orthographic" : "perspective";

    this.settings.cameraMode = nextCameraMode;

    if (this.scene) {
      this._updateConfiguredCamera(true);
    }

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
    this._updateConfiguredCamera(true);

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
      side: THREE.DoubleSide,
    });

    if (this.settings.enableRotation) this._bindRotationEvents();
    if (this.settings.enableZoom) this._bindZoomEvents();

    this._animate();
  }

  _updateConfiguredCamera(createNew) {
    if (this.settings.cameraMode === "orthographic") {
      this._updateCameraOrthographic(createNew);
      return;
    }

    this._updateCamera(createNew);
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
     * Desloca apenas o eixo Y para alinhar o centro da câmera ao centro
     * da chapa da dobra que recua para o fundo.
     */
    const backPlateCenterY =
      this.settings.baseOffsetY +
      this.settings.breakStart +
      this.settings.foldVisualHeight / 2;

    const yOffset = backPlateCenterY - this.settings.centerY;
    const cameraTargetY = this.settings.centerY + yOffset;
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

    this.camera.position.set(this.settings.cameraX, cameraY, finalCameraZ);

    this.camera.lookAt(0, cameraTargetY, 0);

    /*
     * Sempre que FOV, aspect, near ou far mudam, a matriz de projeção
     * precisa ser atualizada para que o Three.js recalcule a projeção.
     */
    this.camera.updateProjectionMatrix();
  }

  _updateCameraOrthographic(createNew) {
    const aspect = this.settings.width / this.settings.height;

    // Na câmera ortográfica, definimos um volume de visão ajustado ao tamanho
    // efetivo do gráfico no frame atual para evitar excesso de espaço vazio.
    const { chartWidth, chartHeight } = this._getChartBounds();

    // O frustum vertical precisa acomodar a altura e, via aspect, também a
    // largura projetada. Usar maxDepth aqui deixava a projeção pequena demais.
    const currentDepth = Math.max(this.settings.depth, 0);
    const projectedWidth = chartWidth + currentDepth;
    const projectedHeight = chartHeight;
    const frustumHeight =
      Math.max(projectedHeight, projectedWidth / Math.max(aspect, 1e-6)) *
      this.settings.cameraMargin;

    const backPlateCenterY =
      this.settings.baseOffsetY +
      this.settings.breakStart +
      this.settings.foldVisualHeight / 2;

    const yOffset = backPlateCenterY - this.settings.centerY;
    const cameraTargetY = this.settings.centerY + yOffset;
    const cameraY = this.settings.cameraY ?? cameraTargetY;

    // Distância fixa bem recuada. Na câmera ortográfica o Z não aproxima nem afasta
    // visualmente, apenas garante que os objetos não fiquem atrás da câmera.
    const finalCameraZ = 100;

    if (createNew || !this.camera || !this.camera.isOrthographicCamera) {
      this.camera = new THREE.OrthographicCamera(
        (frustumHeight * aspect) / -2,
        (frustumHeight * aspect) / 2,
        frustumHeight / 2,
        frustumHeight / -2,
        0.1,
        1000,
      );
    } else {
      // Atualização dos limites caso haja resize da janela
      this.camera.left = (frustumHeight * aspect) / -2;
      this.camera.right = (frustumHeight * aspect) / 2;
      this.camera.top = frustumHeight / 2;
      this.camera.bottom = frustumHeight / -2;
    }

    this.camera.position.set(this.settings.cameraX, cameraY, finalCameraZ);

    this.camera.lookAt(0, cameraTargetY, 0);

    // Essencial atualizar a matriz projetiva após alterar os limites do frustum
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

    const distanceByHeight = objectHeight / (2 * Math.tan(verticalFov / 2));

    /*
     * Como o FOV informado ao Three.js é vertical, calculamos o FOV horizontal
     * equivalente para garantir que a largura do gráfico também caiba na tela.
     */
    const horizontalFov = 2 * Math.atan(Math.tan(verticalFov / 2) * aspect);

    const distanceByWidth = objectWidth / (2 * Math.tan(horizontalFov / 2));

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

    this._updateConfiguredCamera();

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

    if (this.yAxisGroup) {
      this.chartGroup.remove(this.yAxisGroup);
      this.yAxisGroup = null;
    }
  }

  _renderBars(depth) {
    this._clearBars();

    let spacing = this.settings.barWidth + this.settings.barGap;

    this.d.forEach((d, i) => {
      let value = +d[this.valueKey];
      let x = i * spacing - ((this.d.length - 1) * spacing) / 2;

      // Calcula o comprimento físico real unificado
      let scaledLength = this._getScaledBarLength(value, depth);

      // Todas as barras são desenhadas pela mesma montagem
      let bar = this._createFoldedBar(x, scaledLength, depth);

      bar.userData = { datum: d, index: i };

      this.chartGroup.add(bar);
      this.bars.push(bar);

      let label = this._createTextSprite(d[this.labelKey]);
      label.position.set(x, this.settings.baseOffsetY - 0.3, 0);

      this.chartGroup.add(label);
      this.bars.push(label);
    });

    // Renderiza o eixo y somente na camera perspectiva
    if (
      this.settings.cameraMode === "perspective" &&
      this.settings.showPerspectiveYAxis
    ) {
      this._renderPerspectiveYAxis(depth);
    }
  }

  _getScaledBarLength(value, depth) {
    if (this.maxValue === 0) return 0;

    // Calcula as sobras da chapa de cima
    const maxTop =
      this.settings.maxBarHeight -
      this.settings.breakStart -
      this.settings.foldVisualHeight;
    const topLength = Math.max(0, maxTop);

    // Calcula o comprimento total da "fita métrica" desdobrada diretamente no escopo (inline)
    const totalFoldLength =
      this.settings.breakStart + // Chapa da Base
      depth + // Chapa Horizontal de Fundo
      this.settings.foldVisualHeight + // Chapa Vertical do Fundo
      depth + // Chapa Horizontal de Retorno
      topLength; // Chapa do Topo

    // Sem bypass: todas as barras seguem a mesma regra física.
    return (value / this.maxValue) * totalFoldLength;
  }

  _calculateSegmentLengths(scaledLength, depth) {
    /*
     * Determina o comprimento efetivo de cada chapa para uma barra com
     * comprimento escalado 'scaledLength'.
     * Preenche sequencialmente: base -> lower -> back -> upper -> top
     */
    const baseLength = this.settings.breakStart;
    const lowerHorizontal = depth;
    const backLength = this.settings.foldVisualHeight;
    const upperHorizontal = depth;
    const maxTop =
      this.settings.maxBarHeight -
      this.settings.breakStart -
      this.settings.foldVisualHeight;
    const topLength = Math.max(0, maxTop);

    const result = {
      base: 0,
      lower: 0,
      back: 0,
      upper: 0,
      top: 0,
    };

    let remaining = scaledLength;

    // Preencher base
    if (remaining > 0) {
      result.base = Math.min(remaining, baseLength);
      remaining -= result.base;
    }

    // Preencher lower horizontal (indo para o fundo)
    if (remaining > 0) {
      result.lower = Math.min(remaining, lowerHorizontal);
      remaining -= result.lower;
    }

    // Preencher back (subindo lá no fundo)
    if (remaining > 0) {
      result.back = Math.min(remaining, backLength);
      remaining -= result.back;
    }

    // Preencher upper horizontal (voltando para frente)
    if (remaining > 0) {
      result.upper = Math.min(remaining, upperHorizontal);
      remaining -= result.upper;
    }

    // Preencher top (subindo na frente)
    if (remaining > 0) {
      result.top = Math.min(remaining, topLength);
      remaining -= result.top;
    }

    return result;
  }

  _createFoldedBar(x, scaledLength, depth) {
    let group = new THREE.Group();
    group.position.set(x, this.settings.baseOffsetY, 0);

    // Calcula exatamente onde a "gasolina" da barra vai parar
    const segments = this._calculateSegmentLengths(scaledLength, depth);

    let points = [];
    let currentY = 0;
    let currentZ = 0;

    // Ponto zero (base do chão)
    points.push({ y: currentY, z: currentZ });

    // 1. Chapa da Base (cresce para cima no eixo Y)
    if (segments.base > 0) {
      currentY += segments.base;
      points.push({ y: currentY, z: currentZ });
    }

    // 2. Chapa Horizontal Inferior (cresce para o fundo no eixo Z)
    if (segments.lower > 0) {
      currentZ -= segments.lower;
      points.push({ y: currentY, z: currentZ });
    }

    // 3. Chapa do Fundo (cresce para cima no eixo Y, lá no fundo)
    if (segments.back > 0) {
      currentY += segments.back;
      points.push({ y: currentY, z: currentZ });
    }

    // 4. Chapa Horizontal Superior (cresce de volta pra frente no eixo Z)
    if (segments.upper > 0) {
      currentZ += segments.upper;
      points.push({ y: currentY, z: currentZ });
    }

    // 5. Chapa do Topo (cresce para cima no eixo Y, aqui na frente)
    if (segments.top > 0) {
      currentY += segments.top;
      points.push({ y: currentY, z: currentZ });
    }

    // A função de prisma já sabe conectar esses pontos sequencialmente
    let geometry = this._createPrismFromYZProfile(
      points,
      this.settings.barWidth,
      this.settings.barDepth,
    );

    group.add(new THREE.Mesh(geometry, this.material));

    return group;
  }

  _createPrismFromYZProfile(points, width, thickness) {
    if (thickness <= 0) {
      return this._createFlatSurfaceFromYZProfile(points, width);
    }

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

  _createFlatSurfaceFromYZProfile(points, width) {
    let vertices = [];
    let indices = [];

    let xLeft = -width / 2;
    let xRight = width / 2;

    points.forEach((p) => {
      vertices.push(xLeft, p.y, p.z);
      vertices.push(xRight, p.y, p.z);
    });

    for (let i = 0; i < points.length - 1; i++) {
      let a = i * 2;
      let b = (i + 1) * 2;

      // Two-sided quads so the flat bar remains visible from both sides.
      indices.push(a, b, a + 1, a + 1, b, b + 1);
      indices.push(a, a + 1, b, a + 1, b + 1, b);
    }

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

  _renderPerspectiveYAxis(depth) {
    this.yAxisGroup = new THREE.Group();

    const spacing = this.settings.barWidth + this.settings.barGap;

    const chartLeft =
      -((this.d.length - 1) * spacing) / 2 - this.settings.barWidth / 2;

    const chartRight =
      ((this.d.length - 1) * spacing) / 2 + this.settings.barWidth / 2;

    const axisX = chartLeft - this.settings.yAxisOffsetX;

    const maxTop =
      this.settings.maxBarHeight -
      this.settings.breakStart -
      this.settings.foldVisualHeight;

    const totalFoldLength =
      this.settings.breakStart +
      depth +
      this.settings.foldVisualHeight +
      depth +
      Math.max(0, maxTop);

    const axisPoints = this._createFoldPathPoints(totalFoldLength, depth);

    const axisLine = this._createLineFromPoints(
      axisPoints.map(
        (p) => new THREE.Vector3(axisX, this.settings.baseOffsetY + p.y, p.z),
      ),
      this.settings.yAxisColor,
    );

    this.yAxisGroup.add(axisLine);

    const tickCount = this.settings.yAxisTicks;
    
    for (let value = 0; value <= this.maxValue; value += this.settings.yAxisStep) {
      const scaledLength = (value / this.maxValue) * totalFoldLength;

      const point = this._getPointAlongFoldPath(scaledLength, depth);

      const y = this.settings.baseOffsetY + point.y;
      const z = point.z;

      const gridLine = this._createLineFromPoints(
        [new THREE.Vector3(axisX, y, z), new THREE.Vector3(chartRight, y, z)],
        this.settings.yGridColor,
      );

      this.yAxisGroup.add(gridLine);

      const tickLine = this._createLineFromPoints(
        [new THREE.Vector3(axisX - 0.12, y, z), new THREE.Vector3(axisX, y, z)],
        this.settings.yAxisColor,
      );

      this.yAxisGroup.add(tickLine);

      const label = this._createTextSprite(this._formatYAxisValue(value));

      label.position.set(axisX - 0.55, y, z);
      label.scale.set(0.9, 0.45, 1);

      this.yAxisGroup.add(label);
    }

    this.chartGroup.add(this.yAxisGroup);
  }

  _createFoldPathPoints(totalLength, depth) {
    const points = [];

    let remaining = totalLength;
    let y = 0;
    let z = 0;

    points.push({ y, z });

    const base = Math.min(remaining, this.settings.breakStart);
    y += base;
    remaining -= base;
    points.push({ y, z });

    if (remaining > 0) {
      const lower = Math.min(remaining, depth);
      z -= lower;
      remaining -= lower;
      points.push({ y, z });
    }

    if (remaining > 0) {
      const back = Math.min(remaining, this.settings.foldVisualHeight);
      y += back;
      remaining -= back;
      points.push({ y, z });
    }

    if (remaining > 0) {
      const upper = Math.min(remaining, depth);
      z += upper;
      remaining -= upper;
      points.push({ y, z });
    }

    if (remaining > 0) {
      y += remaining;
      points.push({ y, z });
    }

    return points;
  }

  _getPointAlongFoldPath(scaledLength, depth) {
    const segments = this._calculateSegmentLengths(scaledLength, depth);

    let y = 0;
    let z = 0;

    y += segments.base;
    z -= segments.lower;
    y += segments.back;
    z += segments.upper;
    y += segments.top;

    return { y, z };
  }

  _createLineFromPoints(points, color) {
    const geometry = new THREE.BufferGeometry().setFromPoints(points);

    const material = new THREE.LineBasicMaterial({
      color,
      transparent: true,
      opacity: 0.85,
    });

    return new THREE.Line(geometry, material);
  }

  _formatYAxisValue(value) {
    if (value >= 1000) {
      return d3.format(".2s")(value);
    }

    return d3.format(".0f")(value);
  }

  _bindZoomEvents() {
    const canvas = this.renderer.domElement;

    canvas.addEventListener(
      "wheel",
      (e) => {
        if (!this.camera || !this.camera.isPerspectiveCamera) return;

        e.preventDefault();

        const zoomDirection = e.deltaY > 0 ? 1 : -1;

        const currentDistance = this.camera.position.length();

        const nextDistance = THREE.MathUtils.clamp(
          currentDistance +
            zoomDirection * this.settings.zoomSpeed * currentDistance,
          this.settings.minCameraDistance,
          this.settings.maxCameraDistance,
        );

        const scale = nextDistance / currentDistance;

        this.camera.position.multiplyScalar(scale);
        this.camera.updateProjectionMatrix();
      },
      { passive: false },
    );
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
