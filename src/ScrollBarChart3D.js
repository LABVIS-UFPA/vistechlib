let d3 = require("d3");
let THREE = require("three");
let Visualization = require("./Visualization.js");

/**
 * @class
 * @description 3D bar chart with Perspective Scale Break (PSB) for outlier inspection.
 */
class ScrollBarChart3D extends Visualization {
  constructor(parentElement, settings) {
    super(parentElement, settings);
    this.name = "ScrollBarChart3D";
    this.renderer = null;
    this.scene = null;
    this.camera = null;
    this.chartGroup = null;
    this.yAxisGroup = null;
    this.backgroundMesh = null;
    this.bars = [];
    this.animationFrame = null;
    this.material = null;
    this.isDragging = false;
    this.lastPointer = null;
    this.autoReturnEnabled = true;
    this.returnAnimation = null;
    this.toggleButton = null;
    this.initialDepth = settings?.depth ?? 8;
    this.baseGeometrySpec = null;
    this.layout = null;
    this.hoveredBar = null;
    this.highlightMaterial = null;
    this.raycaster = new THREE.Raycaster();
    this.pointerNdc = new THREE.Vector2();

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
    this.settings.fitPadding = {
      top: 0,
      right: 0.03,
      bottom: 0,
      left: 0.08,
    };

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
    this.settings.yAxisColor = 0x333333;
    this.settings.yGridColor = 0xcfcfcf;
    this.settings.yAxisOffsetX = 0.9;
    this.settings.yAxisMinTickPixels = 1;

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
    // 2. Novo parâmetro: Ângulo de elevação (em graus) para ver por cima do gráfico
    // this.settings.cameraElevationAngle = 3;
    this.settings.lensShiftOffset = 1;
    this.settings.cameraMargin = 1.25; //1.25;
    this.settings.cameraMode = "perspective";

    // --- Scroll / Pergaminho Settings ---
    this.settings.maxYLimitRatio = 0.9;
    this.settings.maxYLimit =
      this.settings.maxBarHeight * this.settings.maxYLimitRatio;

    // Novas variáveis da espiral
    this.settings.spiralCoreRadius = 0.15; // Tamanho do "miolo" do rolo
    this.settings.spiralGrowthRate = 0.008; // Quão apertada é a curva (espessura do papel)
    this.settings.scrollLabelVisibilityRate = 0.2; // Taxa de texto desenhados na bobina (1.0 = todos, 0.5 = metade)
    this.settings.useFixedMaxRollRadius = false;

    // Detecção de outlier (Pode manter como estava)
    this.settings.outlierRatioThreshold = 3;

    // Interação
    this.settings.enableRotation = true;
    this.settings.rotationSpeed = 0.01;

    // Offset vertical
    this.settings.baseOffsetY = 0.5;

    // Controlar inspeção 3d
    this.settings.enableAutoReturnToggle = true;
    this.settings.autoReturnDuration = 600;
    this.settings.hoverInspectTiltAngle = 10;
    this.settings.hoverInspectTurnAngle = 90;
    this.settings.hoverInspectDuration = 280;
  }

  data(d) {
    super.data(d);
    this.valueKey = this.settings.valueKey;
    this.labelKey = this.settings.labelKey;

    this._updateResponsiveGeometry();
    this._updateYScale();

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

    this._updateResponsiveGeometry();
    this._updateYScale();

    if (this.renderer && this.camera) {
      this.renderer.setSize(this.settings.width, this.settings.height);
      this._updateConfiguredCamera();

      if (this.hasData) {
        this._renderBars(this.settings.depth);
      }
    }

    return this;
  }

  redraw() {
    if (!this.hasData) return this;

    if (!this.scene) this._createScene();

    this._renderBars(this.settings.depth);

    return super.redraw();
  }

  updateFoldThreshold(ratio) {
    // Garante que o limiar fique entre 1% e 100%
    this.settings.maxYLimitRatio = Math.max(0.01, Math.min(1.0, ratio));

    // Opcional: Reduzir a opacidade/grossura se houver muitas dobras pode ser útil,
    // mas por hora apenas redesenhamos os vértices.
    this._renderBars();

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

  setRollRadiusMode(useFixedMaxRollRadius) {
    this.settings.useFixedMaxRollRadius = !!useFixedMaxRollRadius;

    if (this.scene && this.hasData) {
      this._renderBars(this.settings.depth);
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

  _ensureBaseGeometrySpec() {
    if (this.baseGeometrySpec) return;

    const labelOffset = 0.3;
    const chartHeight =
      this.settings.baseOffsetY + this.settings.maxBarHeight + labelOffset;

    this.baseGeometrySpec = {
      chartHeight,
      maxBarHeightRatio: this.settings.maxBarHeight / chartHeight,
      foldVisualHeightRatio: this.settings.foldVisualHeight / chartHeight,
      baseOffsetYRatio: this.settings.baseOffsetY / chartHeight,
      labelOffsetYRatio: labelOffset / chartHeight,
      gapToBarRatio:
        this.settings.barGap / Math.max(this.settings.barWidth, 1e-6),
      axisOffsetToBarRatio:
        this.settings.yAxisOffsetX / Math.max(this.settings.barWidth, 1e-6),
    };
  }

  _updateResponsiveGeometry() {
    this._ensureBaseGeometrySpec();

    const padding = this.settings.fitPadding || {
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
    };

    const availableWidthRatio = Math.max(
      1e-6,
      1 - padding.left - padding.right,
    );
    const availableHeightRatio = Math.max(
      1e-6,
      1 - padding.top - padding.bottom,
    );

    const viewportAspect =
      (this.settings.width * availableWidthRatio) /
      (Math.max(this.settings.height, 1e-6) * availableHeightRatio);

    const count = Math.max(this.d?.length || 1, 1);
    const baseHeight = this.baseGeometrySpec.chartHeight;
    const chartWidth = baseHeight * viewportAspect;
    const gapToBarRatio = this.baseGeometrySpec.gapToBarRatio;
    const totalUnits = count + Math.max(0, count - 1) * gapToBarRatio;

    const barWidth = chartWidth / Math.max(totalUnits, 1);
    const barGap = barWidth * gapToBarRatio;
    const maxBarHeight = baseHeight * this.baseGeometrySpec.maxBarHeightRatio;
    const foldVisualHeight = this.settings.foldVisualHeight;
    const baseOffsetY = baseHeight * this.baseGeometrySpec.baseOffsetYRatio;

    this.layout = {
      chartWidth,
      chartHeight: baseHeight,
      barWidth,
      barGap,
      maxBarHeight,
      baseOffsetY,
      maxYLimit: maxBarHeight, //maxBarHeight * this.settings.maxYLimitRatio, // Substitui o antigo breakStart
      // zStepDepth: this.settings.zStepDepth,
      yAxisOffsetX: barWidth * this.baseGeometrySpec.axisOffsetToBarRatio,
      labelOffsetY: baseHeight * this.baseGeometrySpec.labelOffsetYRatio,
    };
  }

  _updateYScale() {
    if (!this.d || !this.layout) return;

    this.yScale = d3
      .scaleLinear()
      .domain([0, d3.max(this.d, (item) => +item[this.valueKey])])
      .range([0, this.layout.maxBarHeight]);
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
    this.chartGroup.position.set(this.settings.fitPadding.left * 6, 0, 0);
    this.chartGroup.rotation.set(0, 0, 0);
    this.scene.add(this.chartGroup);

    // this.scene.add(new THREE.AmbientLight(0xffffff, 0.8));

    // let light = new THREE.DirectionalLight(0xffffff, 1);
    // light.position.set(5, 10, 10);
    // this.scene.add(light);

    // /*
    //  * MeshBasicMaterial remove variações de iluminação.
    //  * Isso pode ser útil academicamente porque evita que sombras e brilho
    //  * interfiram na percepção da altura das barras.
    //  */
    this.material = new THREE.MeshBasicMaterial({
      color: this.settings.color,
      side: THREE.DoubleSide,
    });

    this.highlightMaterial = new THREE.MeshBasicMaterial({
      color: new THREE.Color(this.settings.color).lerp(
        new THREE.Color(0xffffff),
        0.25,
      ),
      side: THREE.DoubleSide,
    });

    // 1. Reduzimos a luz ambiente para permitir sombras
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.8));

    // // 2. Luz direcional posicionada acima e levemente à direita
    // let light = new THREE.DirectionalLight(0xffffff, 0.8);
    // light.position.set(0, 0, -10);
    // this.scene.add(light);

    // // 3. Substituímos o Lambert pelo Standard, que reage melhor à luz
    // this.material = new THREE.MeshStandardMaterial({
    //   color: this.settings.color,
    //   roughness: 0.6, // Deixa a superfície mais fosca (bom para gráficos)
    //   metalness: 0.1,
    //   side: THREE.DoubleSide,
    // });

    if (this.settings.enableRotation) this._bindRotationEvents();
    if (this.settings.enableZoom) this._bindZoomEvents();

    this._bindHoverEvents();

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
    if (!this.layout) this._updateResponsiveGeometry();

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

    const finalCameraZ = this.settings.cameraZ ?? cameraDistance;

    /*
     * Desloca apenas o eixo Y para alinhar o centro da câmera ao centro
     * da chapa da dobra que recua para o fundo.
     */
    const { minY, maxY } = this._getVerticalBounds();
    const cameraTargetY = (minY + maxY) / 2;

    // Calculamos o Y usando o ângulo que definimos nas configurações
    // const elevationRad = THREE.MathUtils.degToRad(this.settings.cameraElevationAngle || 0);
    // const cameraY = this.settings.cameraY ?? (cameraTargetY + finalCameraZ * Math.tan(elevationRad));
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

    this.camera.lookAt(0, cameraTargetY, 0); //0, cameraTargetY, 0);

    this.camera.position.multiplyScalar(2.1);
    // this.camera.fov = this.settings.cameraFov * 0.75;

    // Nós criamos uma tela virtual mais alta e capturamos apenas a metade de baixo.
    // Isso move o ponto de fuga central lá para o alto da sua div real.
    const shiftAmount =
      this.settings.height * (this.settings.lensShiftOffset || 0);
    if (shiftAmount > 0) {
      this.camera.setViewOffset(
        this.settings.width,
        this.settings.height + shiftAmount, // Expande a tela virtual
        0,
        shiftAmount, // Corta a tela no topo, empurrando o gráfico visível "para baixo"
        this.settings.width,
        this.settings.height,
      );
    } else {
      this.camera.clearViewOffset();
    }

    /*
     * Sempre que FOV, aspect, near ou far mudam, a matriz de projeção
     * precisa ser atualizada para que o Three.js recalcule a projeção.
     */
    this.camera.updateProjectionMatrix();
  }

  _updateCameraOrthographic(createNew) {
    if (!this.layout) this._updateResponsiveGeometry();

    const aspect = this.settings.width / this.settings.height;
    const { chartWidth, chartHeight } = this._getChartBounds();

    const currentDepth = Math.max(this.settings.depth || 0, 0);
    const projectedWidth = chartWidth + currentDepth;
    const projectedHeight = chartHeight;
    const frustumHeight =
      Math.max(projectedHeight, projectedWidth / Math.max(aspect, 1e-6)) *
      this.settings.cameraMargin;

    const { minY, maxY } = this._getVerticalBounds();
    const cameraTargetY = (minY + maxY) / 2;

    // --- ELEVAÇÃO ORTOGRÁFICA ---
    // Usamos o ângulo (ex: 12 a 20 graus) para subir a câmera e recuá-la.
    // Na câmera ortográfica, a distância Z não altera o tamanho, apenas a posição física da câmera.
    const elevationRad = THREE.MathUtils.degToRad(
      this.settings.cameraElevationAngle || 15,
    );
    const distance = 100; // Distância fixa segura

    const cameraY = cameraTargetY + distance * Math.sin(elevationRad);
    const finalCameraZ = distance * Math.cos(elevationRad);

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
      this.camera.left = (frustumHeight * aspect) / -2;
      this.camera.right = (frustumHeight * aspect) / 2;
      this.camera.top = frustumHeight / 2;
      this.camera.bottom = frustumHeight / -2;
    }

    this.camera.position.set(this.settings.cameraX, cameraY, finalCameraZ);
    this.camera.lookAt(0, cameraTargetY, 0);
    this.camera.updateProjectionMatrix();
  }

  _getChartBounds() {
    if (!this.layout) this._updateResponsiveGeometry();

    const spacing = this.layout.barWidth + this.layout.barGap;

    /*
     * Estimativa da largura total do gráfico no espaço 3D.
     * Serve para calcular a distância mínima da câmera.
     */
    const count = Math.max(this.d?.length || 1, 1);
    const chartWidth =
      count > 1
        ? (count - 1) * spacing + this.layout.barWidth
        : this.layout.barWidth;

    const { minY, maxY } = this._getVerticalBounds();
    const chartHeight = Math.max(1e-6, maxY - minY);

    return { chartWidth, chartHeight };
  }

  _getVerticalBounds() {
    if (!this.layout) this._updateResponsiveGeometry();

    const minY = this.layout.baseOffsetY - this.layout.labelOffsetY;
    const maxY = this.layout.baseOffsetY + this.layout.maxBarHeight;

    return { minY, maxY };
  }

  _calculatePerspectiveDistance(objectWidth, objectHeight, fovDeg, aspect) {
    const padding = this.settings.fitPadding || {
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
    };

    const availableWidthRatio = 1 - padding.left - padding.right;

    const availableHeightRatio = 1 - padding.top - padding.bottom;

    const verticalFov = THREE.MathUtils.degToRad(fovDeg);

    const distanceByHeight =
      objectHeight / (2 * Math.tan(verticalFov / 2) * availableHeightRatio);

    const horizontalFov = 2 * Math.atan(Math.tan(verticalFov / 2) * aspect);

    const distanceByWidth =
      objectWidth / (2 * Math.tan(horizontalFov / 2) * availableWidthRatio);

    return Math.max(distanceByHeight, distanceByWidth);
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

    // Limpa o background
    if (this.backgroundMesh) {
      this.chartGroup.remove(this.backgroundMesh);
      this.backgroundMesh = null;
    }
  }

  _renderBars(depth) {
    if (this.settings.useFixedMaxRollRadius) {
      this._renderBars2(depth);
      return;
    }

    this._clearBars();

    if (!this.layout) this._updateResponsiveGeometry();

    // DESENHA O PAINEL DE FUNDO PRIMEIRO
    this._renderFoldedBackground();

    let spacing = this.layout.barWidth + this.layout.barGap;

    this.d.forEach((d, i) => {
      let value = +d[this.valueKey];
      let x = i * spacing - ((this.d.length - 1) * spacing) / 2;

      // Calcula o comprimento físico real unificado
      let scaledLength = this._getScaledBarLength(value, depth);

      // Todas as barras são desenhadas pela mesma montagem
      let bar = this._createFoldedBar(x, scaledLength);

      bar.userData = {
        datum: d,
        index: i,
        hasFold: scaledLength > this.layout.maxYLimit
      };

      this.chartGroup.add(bar);
      this.bars.push(bar);

      let label = this._createTextSprite(d[this.labelKey]);
      label.position.set(
        x,
        this.layout.baseOffsetY - this.layout.labelOffsetY,
        0,
      );

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

  _renderBars2(depth) {
    this._clearBars();

    if (!this.layout) this._updateResponsiveGeometry();

    // DESENHA O PAINEL DE FUNDO PRIMEIRO
    this._renderFoldedBackground();

    // 1. GERA O CAMINHO MESTRE (Master Path) UMA ÚNICA VEZ
    // Usamos o comprimento do outlier máximo para balizar a espiral inteira
    const maxScaledLength = this._getScaledBarLength(this.maxValue);
    const masterPath = this._generateScrollPoints(maxScaledLength);

    let spacing = this.layout.barWidth + this.layout.barGap;

    this.d.forEach((d, i) => {
      let value = +d[this.valueKey];
      let x = i * spacing - ((this.d.length - 1) * spacing) / 2;

      // 2. Comprimento físico que esta barra específica precisa ter
      let scaledLength = this._getScaledBarLength(value);

      // 3. Corta o caminho mestre para o tamanho exato da barra
      let barPoints = this._truncatePath(masterPath, scaledLength);

      // 4. Constrói o 3D passando os pontos já processados
      let bar = this._createFoldedBar(x, barPoints);

      bar.userData = {
        datum: d,
        index: i,
        hasFold: scaledLength > this.layout.maxYLimit
      };

      this.chartGroup.add(bar);
      this.bars.push(bar);

      let label = this._createTextSprite(d[this.labelKey]);
      label.position.set(
        x,
        this.layout.baseOffsetY - this.layout.labelOffsetY,
        0,
      );

      this.chartGroup.add(label);
      this.bars.push(label);
    });

    // Renderiza o eixo y somente na camera perspectiva
    if (
      this.settings.cameraMode === "perspective" &&
      this.settings.showPerspectiveYAxis
    ) {
      this._renderPerspectiveYAxis2();
    }
  }

  _renderFoldedBackground() {
    if (!this.layout) this._updateResponsiveGeometry();

    // 1. Calcula a largura total necessária para o painel (do eixo até o fim da última barra)
    const spacing = this.layout.barWidth + this.layout.barGap;
    const chartLeft =
      -((this.d.length - 1) * spacing) / 2 - this.layout.barWidth / 2;
    const chartRight =
      ((this.d.length - 1) * spacing) / 2 + this.layout.barWidth / 2;

    // Adicionamos uma margem extra para o painel cobrir bem a área do eixo Y
    const margin = this.layout.barWidth;
    const totalWidth = chartRight - chartLeft + margin * 2;
    const centerX = (chartLeft + chartRight) / 2;

    // 2. Gera os vértices usando o limite máximo (o caminho mais longo possível)
    const maxScaledLength = this._getScaledBarLength(this.maxValue);
    const points = this._generateScrollPoints(maxScaledLength);

    // 3. Cria a geometria plana
    const geometry = this._createFlatSurfaceFromYZProfile(points, totalWidth);

    // 4. Cria o material do "papel"
    const material = new THREE.MeshBasicMaterial({
      color: this.settings.yGridColor, // Usa a mesma cor das linhas de grade para harmonia
      transparent: true,
      opacity: 0, // Bem sutil para não ofuscar os dados
      side: THREE.DoubleSide,
      depthWrite: false, // Fundamental para não conflitar com a transparência das linhas do eixo
      polygonOffset: true,
      polygonOffsetFactor: 1, // Empurra levemente para o fundo no Z-buffer
      polygonOffsetUnits: 1,
    });

    this.backgroundMesh = new THREE.Mesh(geometry, material);

    // Posiciona no centro do gráfico (com o deslocamento Y que as barras também usam)
    // O leve recuo extra no centerX acompanha o eixo Y
    this.backgroundMesh.position.set(
      centerX - margin / 2,
      this.layout.baseOffsetY,
      0,
    );

    this.chartGroup.add(this.backgroundMesh);
  }

  _getScaledBarLength(value) {
    if (this.maxValue === 0) return 0;
    if (!this.layout) this._updateResponsiveGeometry();

    /*
     * O comprimento físico total se a barra não fosse dobrada.
     * Exemplo: se ratio = 0.5 (50%), a barra máxima precisará de 2x a altura
     * máxima do gráfico para ser desenhada totalmente.
     */
    const totalUnfoldedLength =
      this.layout.maxBarHeight / this.settings.maxYLimitRatio;

    return (value / this.maxValue) * totalUnfoldedLength;
  }

  _generateScrollPoints(scaledLength) {
    if (!this.layout) this._updateResponsiveGeometry();

    const points = [];
    let remaining = scaledLength;

    // 1. Face Frontal (Caminho Reto até o Limiar)
    const yMove = Math.min(remaining, this.layout.maxYLimit);
    points.push({ y: 0, z: 0 });
    points.push({ y: yMove, z: 0 });
    remaining -= yMove;

    // Se o dado não passa do limiar, retorna apenas a reta
    if (remaining <= 0) return points;

    // 2. Parâmetros da Espiral
    const a = this.settings.spiralCoreRadius;
    const b = this.settings.spiralGrowthRate;
    const step = 0.1; // Resolução angular (suavidade da curva)

    let tempTheta = 0;
    let tempLength = 0;
    let spiralPoints = [];

    // FASE A: Construir a espiral localmente até consumir todo o "remaining"
    while (tempLength < remaining) {
      let r = a + b * tempTheta;

      // Cálculo aproximado do comprimento do arco (ds)
      let ds = Math.sqrt(r * r + b * b) * step;

      if (tempLength + ds > remaining) {
        // Ajuste fino para cravar exatamente o comprimento da barra
        let exactStep = ((remaining - tempLength) / ds) * step;
        tempTheta += exactStep;
        tempLength = remaining;
      } else {
        tempTheta += step;
        tempLength += ds;
      }

      spiralPoints.push({ angle: tempTheta, r: a + b * tempTheta });
    }

    // FASE B: Rotação e Translação
    // Precisamos conectar o ÚLTIMO ponto gerado (o mais externo) ao topo da reta.
    const maxPoint = spiralPoints[spiralPoints.length - 1];

    // A fórmula da tangente de uma Espiral de Arquimedes
    const tangentAngle = maxPoint.angle + Math.atan2(maxPoint.r, b);

    // Queremos que a curva continue subindo no ponto de conexão (eixo Y positivo).
    // No plano polar de Z (cos) e Y (sen), apontar para cima é PI / 2.
    const targetTangent = Math.PI / 2;
    const rotation = targetTangent - tangentAngle;

    // Coordenadas absolutas onde a espiral deve ancorar
    const connectY = yMove;
    const connectZ = 0;

    // Coordenadas do ponto externo ANTES de transladar
    const extZ = maxPoint.r * Math.cos(maxPoint.angle + rotation);
    const extY = maxPoint.r * Math.sin(maxPoint.angle + rotation);

    // Vetor de deslocamento para encaixar a espiral na reta
    const offsetZ = connectZ - extZ;
    const offsetY = connectY - extY;

    // Adiciona os pontos ao gráfico de trás para frente (da conexão até o miolo)
    for (let i = spiralPoints.length - 1; i >= 0; i--) {
      let p = spiralPoints[i];
      let z = p.r * Math.cos(p.angle + rotation) + offsetZ;

      // Calcula o Y original (que enrola para baixo)
      let originalY = p.r * Math.sin(p.angle + rotation) + offsetY;

      // Inverte o sentido da espiral espelhando o Y em relação à altura da conexão
      let y = connectY + (connectY - originalY);

      points.push({ y, z });
    }

    // Fecha o miolo absoluto com a mesma inversão
    let originalCoreY = a * Math.sin(rotation) + offsetY;
    points.push({
      y: connectY + (connectY - originalCoreY),
      z: a * Math.cos(rotation) + offsetZ,
    });

    return points;
  }

  _truncatePath(masterPath, targetLength) {
    if (targetLength <= 0) return [{ y: 0, z: 0 }];

    const points = [];
    let accumulatedDistance = 0;

    // O primeiro ponto sempre entra (a base no chão)
    points.push(masterPath[0]);

    for (let i = 1; i < masterPath.length; i++) {
      const p1 = masterPath[i - 1];
      const p2 = masterPath[i];

      // Calcula a distância física entre os dois vértices atuais
      const dist = Math.sqrt(
        Math.pow(p2.y - p1.y, 2) + Math.pow(p2.z - p1.z, 2),
      );

      if (accumulatedDistance + dist >= targetLength) {
        // A barra acaba neste segmento. Calculamos a proporção (t) para interpolar a ponta exata
        const remaining = targetLength - accumulatedDistance;
        const t = remaining / dist;

        const finalY = p1.y + (p2.y - p1.y) * t;
        const finalZ = p1.z + (p2.z - p1.z) * t;

        points.push({ y: finalY, z: finalZ });
        break; // Encerra o caminho para esta barra
      } else {
        // A barra passa por este vértice inteiro, adiciona e continua
        points.push(p2);
        accumulatedDistance += dist;
      }
    }

    return points;
  }

  _createFoldedBar(x, scaledLength) {
    if (this.settings.useFixedMaxRollRadius) {
      return this._createFoldedBar2(x, scaledLength);
    }

    if (!this.layout) this._updateResponsiveGeometry();

    let group = new THREE.Group();
    group.position.set(x, this.layout.baseOffsetY, 0);

    // Usa o novo algoritmo iterativo para gerar o caminho
    let points = this._generateScrollPoints(scaledLength);

    // O gerador de prisma já sabe desenhar qualquer N de pontos sequenciais
    // let geometry = this._createPrismFromYZProfile(
    //   points,
    //   this.layout.barWidth,
    //   this.settings.barDepth,
    // );

    // group.add(new THREE.Mesh(geometry, this.material));

    // return group;
    let geometry = this._createPrismFromYZProfile(
      points,
      this.layout.barWidth,
      this.settings.barDepth,
    );

    // Adiciona o sólido da barra
    let mesh = new THREE.Mesh(geometry, this.material);
    mesh.userData.isBarMesh = true;
    group.add(mesh);

    // Cria uma instância de cor do Three.js e multiplica a luminosidade por 0.5 (escurecendo-a)
    let edgeColor = new THREE.Color(this.settings.color).multiplyScalar(0.5);

    // Cria as linhas de contorno apenas nos vincos
    let edgesGeometry = new THREE.EdgesGeometry(geometry, 15); // O 15 é o limite de ângulo
    let edgesMaterial = new THREE.LineBasicMaterial({
      color: edgeColor,
      linewidth: 1, // Nota: a espessura da linha é restrita em alguns navegadores WebGL
      transparent: true,
      opacity: 0.7,
    });
    let wireframe = new THREE.LineSegments(edgesGeometry, edgesMaterial);

    group.add(wireframe);

    return group;
  }

  _createFoldedBar2(x, points) {
    if (!this.layout) this._updateResponsiveGeometry();

    let group = new THREE.Group();
    group.position.set(x, this.layout.baseOffsetY, 0);

    let geometry = this._createPrismFromYZProfile(
      points,
      this.layout.barWidth,
      this.settings.barDepth,
    );

    // Adiciona o sólido da barra
    let mesh = new THREE.Mesh(geometry, this.material);
    mesh.userData.isBarMesh = true;
    group.add(mesh);

    // Cria uma instância de cor do Three.js e multiplica a luminosidade por 0.5 (escurecendo-a)
    let edgeColor = new THREE.Color(this.settings.color).multiplyScalar(0.5);

    // Cria as linhas de contorno apenas nos vincos
    let edgesGeometry = new THREE.EdgesGeometry(geometry, 15); // O 15 é o limite de ângulo
    let edgesMaterial = new THREE.LineBasicMaterial({
      color: edgeColor,
      linewidth: 1, // Nota: a espessura da linha é restrita em alguns navegadores WebGL
      transparent: true,
      opacity: 0.7,
    });
    let wireframe = new THREE.LineSegments(edgesGeometry, edgesMaterial);

    group.add(wireframe);

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
      depthTest: true,
      depthWrite: false,
    });

    const sprite = new THREE.Sprite(material);
    sprite.scale.set(1.2, 0.6, 1);

    return sprite;
  }

  _renderPerspectiveYAxis() {
    if (!this.layout) this._updateResponsiveGeometry();

    this.yAxisGroup = new THREE.Group();

    const spacing = this.layout.barWidth + this.layout.barGap;
    const chartLeft =
      -((this.d.length - 1) * spacing) / 2 - this.layout.barWidth / 2;
    const chartRight =
      ((this.d.length - 1) * spacing) / 2 + this.layout.barWidth / 2;
    const axisX = chartLeft - this.layout.yAxisOffsetX;

    // 1. O eixo mestre agora é apenas uma linha reta
    const axisHeight = Math.min(
      this.layout.maxBarHeight,
      this.layout.maxYLimit,
    );

    const axisLine = this._createLineFromPoints(
      [
        new THREE.Vector3(axisX, this.layout.baseOffsetY, 0),
        new THREE.Vector3(axisX, this.layout.baseOffsetY + axisHeight, 0),
      ],
      this.settings.yAxisColor,
    );

    this.yAxisGroup.add(axisLine);

    // 2. Descobre qual valor máximo os dados atingem na face frontal
    let thresholdDataValue = this.maxValue;
    const totalMaxPhysicalLength =
      this.layout.maxBarHeight / this.settings.maxYLimitRatio;

    if (this.layout.maxYLimit < totalMaxPhysicalLength) {
      thresholdDataValue =
        (this.layout.maxYLimit / totalMaxPhysicalLength) * this.maxValue;
    }

    // 3. Ticks e Labels limitados à face frontal
    const tickCount = Math.max(
      2,
      Math.floor(axisHeight / this.settings.yAxisMinTickPixels),
    );
    let tickValues = d3
      .scaleLinear()
      .domain([0, thresholdDataValue])
      .nice()
      .ticks(tickCount);

    tickValues.forEach((value) => {
      // Cálculo linear simples (sem precisar se preocupar com as dobras em Z)
      const y =
        this.layout.baseOffsetY + (value / thresholdDataValue) * axisHeight;
      const z = 0;

      // Grade traseira
      const gridLine = this._createLineFromPoints(
        [new THREE.Vector3(axisX, y, z), new THREE.Vector3(chartRight, y, z)],
        this.settings.yGridColor,
      );
      this.yAxisGroup.add(gridLine);

      // Traço
      const tickLine = this._createLineFromPoints(
        [new THREE.Vector3(axisX - 0.12, y, z), new THREE.Vector3(axisX, y, z)],
        this.settings.yAxisColor,
      );
      this.yAxisGroup.add(tickLine);

      // Texto
      const label = this._createTextSprite(this._formatYAxisValue(value));
      label.position.set(axisX - 0.55, y, z);
      label.scale.set(0.9, 0.45, 1);
      this.yAxisGroup.add(label);
    });

    this.chartGroup.add(this.yAxisGroup);
  }

  _bindHoverEvents() {
    const canvas = this.renderer.domElement;

    canvas.addEventListener("pointermove", (e) => {
      if (this.isDragging) return;

      const rect = canvas.getBoundingClientRect();

      this.pointerNdc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.pointerNdc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      this.raycaster.setFromCamera(this.pointerNdc, this.camera);

      const intersects = this.raycaster
        .intersectObjects(this.chartGroup.children, true)
        .filter((hit) => hit.object.userData?.isBarMesh);

      const hovered = intersects.length > 0 ? intersects[0].object : null;

      if (hovered === this.hoveredBar) return;

      if (this.hoveredBar) {
        this.hoveredBar.material = this.material;
        if (this.hoveredBar.parent?.userData?.hasFold) {
          this._animateBarInspect(this.hoveredBar.parent, false);
        }
      }

      this.hoveredBar = hovered;

      if (hovered) {
        hovered.material = this.highlightMaterial;

        if (hovered.parent?.userData?.hasFold) {
          this._animateBarInspect(hovered.parent, true);
        }

        canvas.style.cursor = "pointer";
      } else {
        canvas.style.cursor = "default";
      }
    });

    canvas.addEventListener("pointerleave", () => {
      if (this.hoveredBar) {
        this.hoveredBar.material = this.material;

        if (this.hoveredBar.parent?.userData?.hasFold) {
          this._animateBarInspect(this.hoveredBar.parent, false);
        }

        this.hoveredBar = null;
      }

      canvas.style.cursor = "default";
    });
  }

  _animateBarInspect(barGroup, active) {
    if (!barGroup) return;

    if (barGroup.userData.hoverAnimation) {
      cancelAnimationFrame(barGroup.userData.hoverAnimation);
    }

    if (!barGroup.userData.baseRotation) {
      barGroup.userData.baseRotation = {
        x: barGroup.rotation.x,
        y: barGroup.rotation.y,
        z: barGroup.rotation.z,
      };
    }

    const base = barGroup.userData.baseRotation;

    const targetX = active
      ? THREE.MathUtils.degToRad(this.settings.hoverInspectTiltAngle)
      : base.x;

    const targetY = active
      ? THREE.MathUtils.degToRad(this.settings.hoverInspectTurnAngle)
      : base.y;

    const targetZ = base.z;

    const startX = barGroup.rotation.x;
    const startY = barGroup.rotation.y;
    const startZ = barGroup.rotation.z;

    const duration = this.settings.hoverInspectDuration || 280;
    const startTime = performance.now();

    const animate = (currentTime) => {
      const elapsed = currentTime - startTime;
      const t = Math.min(elapsed / duration, 1);

      const easedT = 1 - Math.pow(1 - t, 3);

      barGroup.rotation.x = THREE.MathUtils.lerp(startX, targetX, easedT);

      barGroup.rotation.y = THREE.MathUtils.lerp(startY, targetY, easedT);

      barGroup.rotation.z = THREE.MathUtils.lerp(startZ, targetZ, easedT);

      if (t < 1) {
        barGroup.userData.hoverAnimation = requestAnimationFrame(animate);
      } else {
        barGroup.rotation.set(targetX, targetY, targetZ);

        barGroup.userData.hoverAnimation = null;
      }
    };

    barGroup.userData.hoverAnimation = requestAnimationFrame(animate);
  }

  _renderPerspectiveYAxis2() {
    if (!this.layout) this._updateResponsiveGeometry();

    this.yAxisGroup = new THREE.Group();

    const spacing = this.layout.barWidth + this.layout.barGap;
    const chartLeft =
      -((this.d.length - 1) * spacing) / 2 - this.layout.barWidth / 2;
    const chartRight =
      ((this.d.length - 1) * spacing) / 2 + this.layout.barWidth / 2;
    const axisX = chartLeft - this.layout.yAxisOffsetX;

    // 1. Gera o Caminho Mestre para o Eixo Y
    const maxScaledLength = this._getScaledBarLength(this.maxValue);
    const axisMasterPath = this._generateScrollPoints(maxScaledLength);

    // 2. Desenha a linha mestra contínua do eixo
    const axisPoints3D = axisMasterPath.map(
      (p) => new THREE.Vector3(axisX, this.layout.baseOffsetY + p.y, p.z),
    );
    const axisLine = this._createLineFromPoints(
      axisPoints3D,
      this.settings.yAxisColor,
    );
    this.yAxisGroup.add(axisLine);

    // 3. Define onde termina a reta e começa a espiral
    let thresholdDataValue = this.maxValue;
    const totalMaxPhysicalLength =
      this.layout.maxBarHeight / this.settings.maxYLimitRatio;

    if (this.layout.maxYLimit < totalMaxPhysicalLength) {
      thresholdDataValue =
        (this.layout.maxYLimit / totalMaxPhysicalLength) * this.maxValue;
    }

    // 4. Calcula os Ticks da Face Frontal (Linear padrão)
    const axisHeight = Math.min(
      this.layout.maxBarHeight,
      this.layout.maxYLimit,
    );
    const frontTickCount = Math.max(
      2,
      Math.floor(axisHeight / this.settings.yAxisMinTickPixels),
    );

    let tickValues = d3
      .scaleLinear()
      .domain([0, thresholdDataValue])
      .nice()
      .ticks(frontTickCount);

    // Novo: Um Set para guardar quais valores vão receber o texto
    let labeledTicks = new Set(tickValues); // Todos da frente recebem rótulo

    // 5. Calcula os Ticks da Bobina: Exatamente uma marcação por volta (2*PI)
    if (thresholdDataValue < this.maxValue) {
      const a = this.settings.spiralCoreRadius;
      const b = this.settings.spiralGrowthRate;
      const step = 0.1;

      let remaining = totalMaxPhysicalLength - this.layout.maxYLimit;
      let tempTheta = 0;
      let tempLength = 0;

      // FASE A: Descobrir o ângulo total (maxTheta) da espiral
      while (tempLength < remaining) {
        let r = a + b * tempTheta;
        let ds = Math.sqrt(r * r + b * b) * step;
        if (tempLength + ds > remaining) {
          let exactStep = ((remaining - tempLength) / ds) * step;
          tempTheta += exactStep;
          tempLength = remaining;
        } else {
          tempTheta += step;
          tempLength += ds;
        }
      }
      const maxTheta = tempTheta;

      // FASE B: Recuar 2*PI iterativamente a partir do topo
      let scrollTicks = [];
      let turns = 1;
      let targetTheta = maxTheta - turns * Math.PI * 2;

      while (targetTheta > 0) {
        let lengthAtTurn = 0;
        let t = 0;
        while (t < targetTheta) {
          let r = a + b * t;
          let ds = Math.sqrt(r * r + b * b) * step;
          if (t + step > targetTheta) {
            let exactStep = targetTheta - t;
            ds = Math.sqrt(r * r + b * b) * exactStep;
            lengthAtTurn += ds;
            break;
          }
          lengthAtTurn += ds;
          t += step;
        }

        let physicalDistance =
          this.layout.maxYLimit + (remaining - lengthAtTurn);
        let dataValueAtTurn =
          (physicalDistance / totalMaxPhysicalLength) * this.maxValue;
        scrollTicks.push(dataValueAtTurn);

        turns++;
        targetTheta = maxTheta - turns * Math.PI * 2;
      }

      // FASE C: Processa a visibilidade baseada na porcentagem
      const rate = this.settings.scrollLabelVisibilityRate;
      const labelStep = rate > 0 ? Math.max(1, Math.round(1 / rate)) : Infinity;

      scrollTicks.reverse().forEach((val, index) => {
        tickValues.push(val);
        // O módulo decide se esse tick também ganha um rótulo de texto
        if (index % labelStep === 0) {
          labeledTicks.add(val);
        }
      });
    }

    // Garante que o valor máximo absoluto sempre tenha marca e texto
    if (tickValues[tickValues.length - 1] !== this.maxValue) {
      tickValues.push(this.maxValue);
      labeledTicks.add(this.maxValue);
    }

    // 6. Desenha as linhas e os textos
    tickValues.forEach((value) => {
      const scaledLength = this._getScaledBarLength(value);
      const pathAtValue = this._truncatePath(axisMasterPath, scaledLength);
      const pt = pathAtValue[pathAtValue.length - 1];

      const y = this.layout.baseOffsetY + pt.y;
      const z = pt.z;

      // 1. Verificamos a hierarquia visual desta linha
      const hasLabel = labeledTicks.has(value);

      // Se não tiver texto, a grade fica com 15% de opacidade (bem sutil)
      const gridOpacity = hasLabel ? 0.85 : 0.35;
      // O tracinho do eixo pode ficar com 35% para não sumir totalmente
      const tickOpacity = hasLabel ? 0.85 : 0.35;

      // Desenha a linha de grade (para TODOS os ticks)
      const gridLine = this._createLineFromPoints(
        [new THREE.Vector3(axisX, y, z), new THREE.Vector3(chartRight, y, z)],
        this.settings.yGridColor,
        gridOpacity,
      );
      this.yAxisGroup.add(gridLine);

      // Desenha o tracinho lateral (para TODOS os ticks)
      const tickLine = this._createLineFromPoints(
        [new THREE.Vector3(axisX - 0.12, y, z), new THREE.Vector3(axisX, y, z)],
        this.settings.yAxisColor,
        tickOpacity,
      );
      this.yAxisGroup.add(tickLine);

      // Desenha o Rótulo de Texto SOMENTE se o valor estiver no Set
      if (hasLabel) {
        const label = this._createTextSprite(this._formatYAxisValue(value));
        label.position.set(axisX - 0.55, y, z);
        label.scale.set(0.9, 0.45, 1);
        this.yAxisGroup.add(label);
      }
    });

    this.chartGroup.add(this.yAxisGroup);
  }

  _createLineFromPoints(points, color, opacity = 0.85) {
    const geometry = new THREE.BufferGeometry().setFromPoints(points);

    const material = new THREE.LineBasicMaterial({
      color,
      transparent: true,
      opacity: opacity,
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
      const wasDragging = this.isDragging;

      this.isDragging = false;
      this.lastPointer = null;

      if (wasDragging && this.autoReturnEnabled) {
        this._returnToInitialRotation();
      }
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

  _returnToInitialRotation() {
    if (!this.chartGroup) return;

    if (this.returnAnimation) {
      cancelAnimationFrame(this.returnAnimation);
    }

    const startX = this.chartGroup.rotation.x;
    const startY = this.chartGroup.rotation.y;
    const startZ = this.chartGroup.rotation.z;

    const duration = this.settings.autoReturnDuration || 600;
    const startTime = performance.now();

    const animateReturn = (currentTime) => {
      const elapsed = currentTime - startTime;
      const t = Math.min(elapsed / duration, 1);

      const easedT = 1 - Math.pow(1 - t, 3);

      // Rotação
      this.chartGroup.rotation.x = THREE.MathUtils.lerp(startX, 0, easedT);
      this.chartGroup.rotation.y = THREE.MathUtils.lerp(startY, 0, easedT);
      this.chartGroup.rotation.z = THREE.MathUtils.lerp(startZ, 0, easedT);

      if (t < 1) {
        this.returnAnimation = requestAnimationFrame(animateReturn);
      } else {
        this.chartGroup.rotation.set(0, 0, 0);
        this.returnAnimation = null;
      }
    };

    this.returnAnimation = requestAnimationFrame(animateReturn);
  }

  _animate() {
    this.renderer.render(this.scene, this.camera);
    this.animationFrame = requestAnimationFrame(() => this._animate());
  }
}

module.exports = ScrollBarChart3D;
