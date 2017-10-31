/**
 * @license
 * Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */

import '../demo-header';
import '../demo-footer';
// tslint:disable-next-line:max-line-length
import {Array3D, gpgpu_util, GPGPUContext, NDArrayMathCPU, NDArrayMathGPU} from '../deeplearn';
import * as topk_image_classifier from '../../models/topk_image_classifier';
import {PolymerElement, PolymerHTMLElement} from '../polymer-spec';

declare var Dosbox:any;

// tslint:disable-next-line:variable-name
export const TeachableGamingDemoPolymer: new () => PolymerHTMLElement =
    PolymerElement({
      is: 'teachablegaming-demo',
      properties: {
      }
    });

/**
 * NOTE: To use the webcam without SSL, use the chrome flag:
 * --unsafely-treat-insecure-origin-as-secure=\
 *     http://localhost:5432
 */

export class TeachableGamingtDemo extends TeachableGamingDemoPolymer {
  private math: NDArrayMathGPU;
  private mathCPU: NDArrayMathCPU;
  private gl: WebGLRenderingContext;
  private gpgpu: GPGPUContext;
  private selectedIndex = -1;

  private webcamVideoElement: HTMLVideoElement;
  private classifier: topk_image_classifier.TopKImageClassifier;
  private toggles: Array<HTMLElement>;
  private countBoxes: Array<HTMLElement>;
  private clears: Array<HTMLElement>;
  private indicators: Array<HTMLElement>;
  private upToggle: HTMLElement;
  private downToggle: HTMLElement;
  private leftToggle: HTMLElement;
  private rightToggle: HTMLElement;
  private spaceToggle: HTMLElement;
  private sToggle: HTMLElement;
  private upText: HTMLElement;
  private downText: HTMLElement;
  private leftText: HTMLElement;
  private rightText: HTMLElement;
  private spaceText: HTMLElement;
  private sText: HTMLElement;


  ready() {
    this.webcamVideoElement =
        this.querySelector('#webcamVideo') as HTMLVideoElement;
    this.upToggle = this.$.upswitch;
    this.downToggle = this.$.downswitch;
    this.leftToggle = this.$.leftswitch;
    this.rightToggle = this.$.rightswitch;
    this.spaceToggle = this.$.spaceswitch;
    this.sToggle = this.$.sswitch;
    this.toggles = [this.upToggle, this.downToggle, this.leftToggle,
      this.rightToggle, this.spaceToggle, this.sToggle];
    this.upText = this.$.upcount;
    this.downText = this.$.downcount;
    this.leftText = this.$.leftcount;
    this.rightText = this.$.rightcount;
    this.spaceText = this.$.spacecount;
    this.sText = this.$.scount;
    this.countBoxes = [this.upText, this.downText, this.leftText, this.rightText,
      this.spaceText, this.sText];
    this.clears = [this.$.upclear, this.$.downclear, this.$.leftclear,
      this.$.rightclear, this.$.spaceclear, this.$.sclear];
    this.indicators = [this.$.upindicator, this.$.downindicator,
      this.$.leftindicator, this.$.rightindicator, this.$.spaceindicator,
      this.$.sindicator];

    // tslint:disable-next-line:no-any
    const navigatorAny = navigator as any;
    navigator.getUserMedia = navigator.getUserMedia ||
        navigatorAny.webkitGetUserMedia || navigatorAny.mozGetUserMedia ||
        navigatorAny.msGetUserMedia;
    if (navigator.getUserMedia) {
      navigator.getUserMedia(
          {video: true},
          (stream) => {
            this.webcamVideoElement.src = window.URL.createObjectURL(stream);
          },
          (error) => {
            console.log(error);
          });
    }

    this.gl = gpgpu_util.createWebGLContext(this.inferenceCanvas);
    this.gpgpu = new GPGPUContext(this.gl);
    this.math = new NDArrayMathGPU(this.gpgpu);
    this.mathCPU = new NDArrayMathCPU();
    this.classifier = new topk_image_classifier.TopKImageClassifier(6, 5, this.math, this.mathCPU);

    this.when(() => this.isDosboxReady(), () => this.loadDosbox());
    setTimeout(() => this.animate(), 1000);
  }

  toggle(event: Event) {
    const target = event.target as HTMLButtonElement;
    let index = -1;
    for (let i = 0; i < this.toggles.length; i++) {
      if (this.toggles[i] === target) {
        index = i;
        break;
      }
    }
    if (index === -1) {
      console.log("error bad toggle");
      return;
    }

    if ((target as any).checked) {
      this.selectedIndex = index;
      for (let i = 0; i < this.toggles.length; i++) {
        if (i !== index) {
          (this.toggles[i] as any).checked = false;
        }
      }
    } else {
      this.selectedIndex = -1;
    }
    console.log(this.selectedIndex);
  }

  clear(event: Event) {
    const target = event.target as HTMLButtonElement;
    let index = -1;
    for (let i = 0; i < this.clears.length; i++) {
      if (this.clears[i] === target) {
        index = i;
        break;
      }
    }
    if (index === -1) {
      console.log("error bad button");
      return;
    }
    this.classifier.clearClass(index);
    this.countBoxes[index].innerHTML = '0';
  }

  private isDosboxReady() {
    return (window as any).Dosbox && (window as any).$;
  }

  private loadDosbox() {
    console.log("dosbox ready");
    /* tslint:disable */
    new Dosbox({
      id: "dosbox",
      onload: (dosbox: any) => {
        console.log("loading game");
        dosbox.run("https://js-dos.com/cdn/upload/DOOM-@evilution.zip", "./DOOM/DOOM.EXE");
        //dosbox.run("https://js-dos.com/cdn/upload/mario-colin.zip", "./mario.exr")
      },
      onrun: (dosbox: {}, app: string) => {
        console.log("App '" + app + "' is running");
      }
    });
    /* tslint:enable */
  }

  private async animate() {
    if (this.selectedIndex >= 0) {
      await this.math.scope(async (keep, track) => {
        const image = track(Array3D.fromPixels(this.webcamVideoElement));

        this.classifier.addImage(image, this.selectedIndex);
        this.countBoxes[this.selectedIndex].innerHTML = String(
          +this.countBoxes[this.selectedIndex].innerHTML + 1);
      });
    }
    else {
      await this.math.scope(async (keep, track) => {
        const image = track(Array3D.fromPixels(this.webcamVideoElement));
        const results = this.classifier.infer(image);
        this.$.detected.innerHTML = results.classIndex;
        console.log(results);
        if (results.classIndex === 0) {
          //console.log(results);
          const elem = this.$.dosbox;
          //const elem = document;
          elem.dispatchEvent(new KeyboardEvent('keypress', {bubbles: true, key:'ArrowDown'}));
          elem.dispatchEvent(new KeyboardEvent('keydown', {bubbles: true, key:'ArrowDown'}));
          elem.dispatchEvent(new KeyboardEvent('keyup', {bubbles: true, key:'ArrowDown'}));
        }
      });
    }

    setTimeout(() => this.animate(), 100);
  }

  when(check: () => any, exec: () => void) {
    let cancelled = false;
    const attempt = () => {
      if (cancelled) {
        return;
      }
      if (check()) {
        exec();
      } else {
        requestAnimationFrame(attempt);
      }
    };
    attempt();
    return {cancel: () => cancelled = true};
  }
}

document.registerElement(TeachableGamingtDemo.prototype.is, TeachableGamingtDemo);
