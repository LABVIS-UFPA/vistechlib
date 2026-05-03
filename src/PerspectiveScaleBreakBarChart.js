let d3 = require("d3");
let THREE = require("three");
let Visualization = require("./Visualization.js");

/**
 * @class PerspectiveScaleBreakBarChart
 *
 * @description
 * Gráfico de barras 3D com quebra de escala em perspectiva.
 *
 * A ideia central é:
 * - barras não-outliers são representadas proporcionalmente dentro de uma escala local;
 * - o outlier não domina a escala vertical;
 * - o excesso do outlier é representado por uma dobra no eixo Z;
 * - o slider de profundidade altera apenas a dobra, não os valores dos dados.
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

    this.maxValue = null;
    this.maxNonOutlier = null;
    this.minNonOutlier = null;
    this.outlierIndex = -1;
    this.hasOutlier = false;
    this.outlierRatio = 1;
    this.breakValue = null;

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

  /**
   * Define os valores padrão do gráfico.
   *
   * Aqui ficam separados:
   * - parâmetros visuais;
   * - parâmetros de câmera;
   * - parâmetros da quebra de escala;
   * - parâmetros de interação.
   */
  _putDefaultSettings() {
    // Dimensões e aparência geral
    this.settings.width = 900;
    this.settings.height = 500;
    this.settings.color = 0x457b9d;
    this.settings.backgroundColor = 0xf8f9fa;

    // Chaves dos dados
    this.settings.labelKey = "label";
    this.settings.valueKey = "value";

    // Geometria das barras
    this.settings.barWidth = 1.2;
    this.settings.barDepth = 0.8;
    this.settings.barGap = 0.5;

    // Altura visual máxima da escala comum, antes da quebra
    this.settings.breakStart = 5.2;

    // Altura visual ocupada pela região de dobra
    this.settings.foldVisualHeight = 1.4;

    // Define quanto acima do maior não-outlier a quebra começa
    this.settings.breakPaddingRatio = 1.2;

    // Caso queira forçar manualmente o valor da quebra
    this.settings.breakValue = null;

    // Profundidade da dobra do outlier no eixo Z
    this.settings.depth = 8;
    this.settings.minDepth = 0;
    this.settings.maxDepth = 8;

    // Critério para identificar outlier
    this.settings.outlierRatioThreshold = 3;

    // Offset vertical para deixar espaço para rótulos
    this.settings.baseOffsetY = 1.5;

    // Câmera perspectiva
    this.settings.cameraNear = 0.1;
    this.settings.cameraFar = 1000;
    this.settings.cameraX = 0;
    this.settings.cameraY = null;
    this.settings.cameraZ = null;
    this.settings.cameraFov = 20;
    this.settings.cameraMargin = 1.25;

    // Interação
    this.settings.enableRotation = true;
    this.settings.rotationSpeed = 0.01;
  }

  /**
   * Recebe os dados, calcula informações estatísticas básicas,
   * configura a escala quebrada e redesenha o gráfico.
   *
   * @param {Array<Object>} d Dados do gráfico.
   * @returns {PerspectiveScaleBreakBarChart}
   */
  data(d) {
    super.data(d);

    this.valueKey = this.settings.valueKey;
    this.labelKey = this.settings.labelKey;

    this._calculateOutlierInfo();
    this._createBrokenScale();

    this.redraw();

    return this;
  }

  /**
   * Redimensiona o renderer e recalibra a câmera.
   *
   * @returns {PerspectiveScaleBreakBarChart}
   */
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

  /**
   * Redesenha o gráfico inteiro.
   *
   * @returns {PerspectiveScaleBreakBarChart}
   */
  redraw() {
    if (!this.hasData) return this;

    if (!this.scene) this._createScene();

    this._renderBars(this.settings.depth);

    return super.redraw();
  }

  /**
   * Atualiza apenas a profundidade da dobra do outlier.
   *
   * Importante:
   * este método NÃO altera a altura das barras comuns.
   * O slider controla apenas a dimensão Z da dobra.
   *
   * @param {number} depth Nova profundidade.
   * @returns {PerspectiveScaleBreakBarChart}
   */
  updateDepth(depth) {
    this.settings.depth = Math.max(
      this.settings.minDepth,
      Math.min(this.settings.maxDepth, depth),
    );

    this._renderBars(this.settings.depth);

    return this;
  }

  /**
   * Libera recursos gráficos e remove o conteúdo WebGL.
   *
   * @returns {PerspectiveScaleBreakBarChart}
   */
  destroy() {
    if (this.animationFrame) cancelAnimationFrame(this.animationFrame);

    this._clearBars();

    if (this.renderer) {
      this.renderer.dispose();
    }

    this.webglContainer.innerHTML = "";

    return this;
  }

  /**
   * Calcula:
   * - maior valor;
   * - segundo maior valor;
   * - razão de outlier;
   * - índice do outlier;
   * - maior valor não-outlier;
   * - menor valor não-outlier.
   *
   * O índice do outlier é usado no lugar de value === maxValue,
   * pois podem existir valores repetidos.
   */
  _calculateOutlierInfo() {
    let values = this.d.map((item) => +item[this.valueKey]);

    let sortedValues = [...values].sort((a, b) => b - a);

    this.maxValue = sortedValues[0];
    let secondMaxValue = sortedValues[1] || this.maxValue;

    this.outlierRatio = this.maxValue / secondMaxValue;
    this.hasOutlier = this.outlierRatio >= this.settings.outlierRatioThreshold;

    this.outlierIndex = values.indexOf(this.maxValue);

    let nonOutliers = values.filter((_, index) => index !== this.outlierIndex);

    this.maxNonOutlier = nonOutliers.length
      ? Math.max(...nonOutliers)
      : this.maxValue;

    this.minNonOutlier = nonOutliers.length
      ? Math.min(...nonOutliers)
      : this.maxValue;

    if (!this.hasOutlier) {
      this.outlierIndex = -1;
      this.maxNonOutlier = this.maxValue;
    }
  }

  /**
   * Cria a escala visual quebrada.
   *
   * Com outlier:
   * - o domínio da escala Y vai de 0 até breakValue;
   * - breakValue fica próximo ao maior valor não-outlier;
   * - o outlier é limitado visualmente até essa altura.
   *
   * Sem outlier:
   * - a escala se comporta como uma escala linear comum.
   */
  _createBrokenScale() {
    if (this.hasOutlier) {
      this.breakValue =
        this.settings.breakValue ||
        this.maxNonOutlier * this.settings.breakPaddingRatio;
    } else {
      this.breakValue = this.maxValue;
    }

    this.yScale = d3
      .scaleLinear()
      .domain([0, this.breakValue])
      .range([0, this.settings.breakStart])
      .clamp(true);
  }

  /**
   * Cria a cena Three.js:
   * - scene;
   * - camera;
   * - renderer;
   * - grupo principal;
   * - luzes;
   * - material;
   * - eventos de rotação.
   */
  _createScene() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(this.settings.backgroundColor);

    this._updateCamera(true);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(window.devicePixelRatio || 1);
    this.renderer.setSize(this.settings.width, this.settings.height);

    this.webglContainer.innerHTML = "";
    this.webglContainer.appendChild(this.renderer.domElement);

    this.chartGroup = new THREE.Group();
    this.chartGroup.rotation.set(0, 0, 0);
    this.scene.add(this.chartGroup);

    this.material = new THREE.MeshBasicMaterial({
      color: this.settings.color,
    });

    if (this.settings.enableRotation) this._bindRotationEvents();

    this._animate();
  }

  /**
   * Atualiza ou cria a câmera perspectiva.
   *
   * A distância da câmera é calculada a partir:
   * - do FOV;
   * - da largura estimada do gráfico;
   * - da altura estimada do gráfico;
   * - da razão de aspecto.
   *
   * Isso evita usar um cameraZ arbitrário.
   *
   * @param {boolean} createNew Indica se uma nova câmera deve ser criada.
   */
  _updateCamera(createNew) {
    const aspect = this.settings.width / this.settings.height;
    const { chartWidth, chartHeight } = this._getChartBounds();

    const cameraDistance = this._calculatePerspectiveDistance(
      chartWidth,
      chartHeight,
      this.settings.cameraFov,
      aspect,
    );

    const finalCameraZ =
      this.settings.cameraZ ?? cameraDistance * this.settings.cameraMargin;

    const cameraTargetY =
      this.settings.baseOffsetY + this.settings.breakStart / 2;

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
    this.camera.updateProjectionMatrix();
  }

  /**
   * Estima os limites visuais do gráfico.
   *
   * Esses valores são usados para posicionar a câmera corretamente.
   *
   * @returns {{chartWidth: number, chartHeight: number}}
   */
  _getChartBounds() {
    const spacing = this.settings.barWidth + this.settings.barGap;

    const chartWidth = this.d ? this.d.length * spacing : spacing;

    const chartHeight =
      this.settings.baseOffsetY +
      this.settings.breakStart +
      this.settings.foldVisualHeight +
      1;

    return { chartWidth, chartHeight };
  }

  /**
   * Calcula a distância necessária da câmera perspectiva
   * para enquadrar o gráfico.
   *
   * Fórmula:
   * visibleHeight = 2 * distance * tan(fov / 2)
   *
   * @param {number} objectWidth Largura do objeto.
   * @param {number} objectHeight Altura do objeto.
   * @param {number} fovDeg FOV vertical em graus.
   * @param {number} aspect Razão largura/altura.
   * @returns {number} Distância calculada.
   */
  _calculatePerspectiveDistance(objectWidth, objectHeight, fovDeg, aspect) {
    const verticalFov = THREE.MathUtils.degToRad(fovDeg);

    const distanceByHeight = objectHeight / (2 * Math.tan(verticalFov / 2));

    const horizontalFov = 2 * Math.atan(Math.tan(verticalFov / 2) * aspect);

    const distanceByWidth = objectWidth / (2 * Math.tan(horizontalFov / 2));

    return Math.max(distanceByHeight, distanceByWidth);
  }

  /**
   * Retorna a visualização para a posição frontal calibrada.
   *
   * @returns {PerspectiveScaleBreakBarChart}
   */
  resetView() {
    if (this.chartGroup) {
      this.chartGroup.rotation.set(0, 0, 0);
    }

    this._updateCamera();

    return this;
  }

  /**
   * Calcula a altura visual de uma barra.
   *
   * Importante:
   * - barras comuns usam a escala quebrada;
   * - valores acima da quebra são limitados visualmente;
   * - a profundidade NÃO influencia a altura.
   *
   * @param {number} value Valor real do dado.
   * @returns {number} Altura visual.
   */
  _getVisualHeight(value) {
    return this.yScale(value);
  }

  /**
   * Remove barras e rótulos anteriores da cena.
   *
   * Importante:
   * não descartamos this.material aqui, porque ele é compartilhado
   * pelas barras e será reutilizado nos próximos redesenhos.
   */
  _clearBars() {
    this.bars.forEach((bar) => {
      this.chartGroup.remove(bar);

      if (bar.geometry) {
        bar.geometry.dispose();
      }

      // Descarta apenas materiais próprios, como sprites e marcadores.
      // Não descarta o material principal compartilhado das barras.
      if (bar.material && bar.material !== this.material) {
        if (bar.material.map) {
          bar.material.map.dispose();
        }

        bar.material.dispose();
      }

      // Caso seja um grupo, percorre seus filhos.
      if (bar.children && bar.children.length) {
        bar.traverse((child) => {
          if (child.geometry) {
            child.geometry.dispose();
          }

          if (child.material && child.material !== this.material) {
            if (child.material.map) {
              child.material.map.dispose();
            }

            child.material.dispose();
          }
        });
      }
    });

    this.bars = [];
  }

  /**
   * Renderiza todas as barras do gráfico.
   *
   * O outlier recebe uma geometria especial com dobra.
   * As demais barras são prismas simples.
   *
   * @param {number} depth Profundidade atual da dobra.
   */
  _renderBars(depth) {
    this._clearBars();

    let spacing = this.settings.barWidth + this.settings.barGap;

    this.d.forEach((d, i) => {
      let value = +d[this.valueKey];
      let x = i * spacing - ((this.d.length - 1) * spacing) / 2;

      let bar;

      if (this.hasOutlier && i === this.outlierIndex) {
        let breakHeight = this._getVisualHeight(this.breakValue);
        bar = this._createFoldedBar(x, breakHeight, depth);
      } else {
        let height = this._getVisualHeight(value);
        bar = this._createNormalBar(x, height);
      }

      bar.userData = { datum: d, index: i };

      this.chartGroup.add(bar);
      this.bars.push(bar);

      let label = this._createTextSprite(d[this.labelKey]);
      label.position.set(x, this.settings.baseOffsetY - 0.3, 0);

      this.chartGroup.add(label);
      this.bars.push(label);
    });
  }

  /**
   * Cria uma barra normal, sem dobra.
   *
   * @param {number} x Posição horizontal da barra.
   * @param {number} height Altura visual da barra.
   * @returns {THREE.Mesh}
   */
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

  /**
   * Cria a barra outlier com quebra de escala.
   *
   * A barra é dividida conceitualmente em:
   * - trecho inferior: até o ponto da quebra;
   * - trecho dobrado: metáfora visual do excesso;
   * - trecho superior curto: indica continuidade do outlier.
   *
   * O parâmetro depth controla apenas o deslocamento no eixo Z.
   *
   * @param {number} x Posição horizontal da barra.
   * @param {number} breakHeight Altura visual até a quebra.
   * @param {number} depth Profundidade da dobra.
   * @returns {THREE.Group}
   */
  _createFoldedBar(x, breakHeight, depth) {
    let group = new THREE.Group();
    group.position.set(x, this.settings.baseOffsetY, 0);

    const safeDepth = Math.max(0, depth);
    const topVisualHeight = 0.8;

    /*
     * Altura visual total do outlier na representação quebrada.
     * Mesmo sem profundidade, a barra deve continuar visível.
     */
    const totalVisualHeight =
      breakHeight + this.settings.foldVisualHeight + topVisualHeight;

    /*
     * Quando depth = 0, a dobra fica "esticada" na vertical.
     * Ou seja: não há deslocamento para trás no eixo Z,
     * mas a parte superior continua aparecendo.
     */
    if (safeDepth <= 0) {
      let mesh = new THREE.Mesh(
        new THREE.BoxGeometry(
          this.settings.barWidth,
          totalVisualHeight,
          this.settings.barDepth,
        ),
        this.material,
      );

      mesh.position.set(0, totalVisualHeight / 2, 0);
      group.add(mesh);

      return group;
    }

    let y0 = 0;
    let y1 = breakHeight;

    let y2 = breakHeight + this.settings.foldVisualHeight * 0.35;
    let y3 = breakHeight + this.settings.foldVisualHeight * 0.65;
    let y4 = breakHeight + this.settings.foldVisualHeight;

    let y5 = y4 + topVisualHeight;

    let points = [
      { y: y0, z: 0 },
      { y: y1, z: 0 },
      { y: y2, z: -safeDepth },
      { y: y3, z: -safeDepth },
      { y: y4, z: 0 },
      { y: y5, z: 0 },
    ];

    let geometry = this._createPrismFromYZProfile(
      points,
      this.settings.barWidth,
      this.settings.barDepth,
    );

    let mesh = new THREE.Mesh(geometry, this.material);
    group.add(mesh);

    return group;
  }

  /**
   * Cria uma geometria prismática a partir de um perfil no plano YZ.
   *
   * O perfil define a dobra da barra.
   * A largura no eixo X e a espessura no eixo Z são aplicadas depois.
   *
   * @param {Array<{y: number, z: number}>} points Perfil YZ.
   * @param {number} width Largura no eixo X.
   * @param {number} thickness Espessura no eixo Z.
   * @returns {THREE.BufferGeometry}
   */
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

  /**
   * Cria um rótulo textual como Sprite.
   *
   * @param {string} text Texto do rótulo.
   * @returns {THREE.Sprite}
   */
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

  /**
   * Registra eventos de rotação manual do gráfico.
   *
   * A rotação é aplicada ao chartGroup, não à câmera.
   * Assim, a câmera frontal calibrada continua preservada.
   */
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

  /**
   * Loop de renderização.
   *
   * Mesmo sem animação automática, o loop mantém a cena atualizada
   * durante interações e mudanças de estado.
   */
  _animate() {
    this.renderer.render(this.scene, this.camera);
    this.animationFrame = requestAnimationFrame(() => this._animate());
  }
}

module.exports = PerspectiveScaleBreakBarChart;
