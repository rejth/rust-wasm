import { Matrix4 } from './Matrix';
import { NodeTransformation, SceneGraphNode } from './SceneGraph';
import { Vector3D } from './Vector3D';

export class OrbitCamera {
  readonly canvas: HTMLCanvasElement;

  #isDragging = false;

  #startX = 0;
  #startY = 0;
  #startPan = 0;
  #startTilt = 0;
  #startRadius = 0;
  #startCameraMatrix = new Matrix4();
  #startTarget = new Vector3D();

  #cameraTarget: SceneGraphNode;
  #cameraPan: SceneGraphNode;
  #cameraTilt: SceneGraphNode;
  #cameraExtend: SceneGraphNode;
  #camera: SceneGraphNode;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;

    /**
     * Create Camera Rig:
     * The camera target is the camera base (center of the scene).
     * The camera pan is the horizontal rotation (around the Y axis) of the camera.
     * The camera tilt is the vertical rotation (around the X axis) of the camera.
     * The camera extend is the distance from the camera to the camera target (along the Z axis).
     * The camera is the final camera rig which includes the camera target, pan, tilt, and extend.
     */
    this.#cameraTarget = this.#addNode('cameraTarget');
    this.#cameraPan = this.#addNode('cameraPan', this.#cameraTarget);
    this.#cameraTilt = this.#addNode('cameraTilt', this.#cameraPan);
    this.#cameraExtend = this.#addNode('cameraExtend', this.#cameraTilt);
    this.#camera = this.#addNode('camera', this.#cameraExtend);
  }

  setParent(parent: SceneGraphNode) {
    this.#cameraTarget.setParent(parent);
  }

  getMatrix() {
    return this.#camera.worldMatrix;
  }

  /**
   * The rotation around the Y axis.
   */
  get pan() {
    return this.#cameraPan.source.rotation[1];
  }

  set pan(rotationY: number) {
    this.#cameraPan.source.rotation[1] = rotationY;
  }

  /**
   * The rotation around the X axis.
   */
  get tilt() {
    return this.#cameraTilt.source.rotation[0];
  }

  set tilt(rotationX: number) {
    this.#cameraTilt.source.rotation[0] = rotationX;
  }

  /**
   * The distance along the Z axis.
   */
  get radius() {
    return this.#cameraExtend.source.translation[2];
  }

  set radius(translationZ: number) {
    this.#cameraExtend.source.translation[2] = translationZ;
  }

  /**
   * The target of the camera.
   */
  get target(): Vector3D {
    const [x, y, z] = this.#cameraTarget.source.translation;
    return new Vector3D(x, y, z);
  }

  set target(v: Vector3D) {
    this.#cameraTarget.source.translation.set([v.x, v.y, v.z]);
  }

  handleDown(event: PointerEvent) {
    this.#isDragging = true;
    this.canvas.setPointerCapture(event.pointerId);
    this.#updateStartPosition(event);
  }

  handleMove(event: PointerEvent) {
    if (!this.#isDragging || !this.canvas.hasPointerCapture(event.pointerId)) {
      return;
    }

    this.#track(event.clientX, event.clientY);
  }

  handleUp(event: PointerEvent) {
    this.canvas.releasePointerCapture(event.pointerId);
    this.#isDragging = false;
  }

  handleDolly(event: WheelEvent) {
    this.#updateStartPosition(event);
    this.#dolly(event.deltaY);
  }

  #panAndTilt(x: number, y: number) {
    const deltaPan = x - this.#startX;
    const deltaTilt = y - this.#startY;

    this.pan = this.#startPan - deltaPan;
    this.tilt = this.#startTilt - deltaTilt;
  }

  #track(x: number, y: number) {
    const deltaX = x - this.#startX;
    const deltaY = y - this.#startY;

    const mat = this.#startCameraMatrix.elements;
    const right = new Vector3D(mat[0], mat[1], mat[2]);
    const up = new Vector3D(mat[4], mat[5], mat[6]);
    const offset = right.scale(-deltaX).add(up.scale(deltaY));

    this.target = this.#startTarget.add(offset);
  }

  #dolly(delta: number) {
    this.radius = this.#startRadius - delta;
  }

  #updateStartPosition(event: PointerEvent | WheelEvent) {
    this.#startX = event.clientX;
    this.#startY = event.clientY;

    this.#startPan = this.pan;
    this.#startTilt = this.tilt;
    this.#startRadius = this.radius;

    this.#startCameraMatrix = this.getMatrix().copy();
    this.#startTarget.set(this.target);
  }

  #addNode(id: string, parent?: SceneGraphNode, transformation?: NodeTransformation) {
    const node = new SceneGraphNode(id, transformation);

    if (parent) {
      parent.addChild(node);
    }

    return node;
  }
}
