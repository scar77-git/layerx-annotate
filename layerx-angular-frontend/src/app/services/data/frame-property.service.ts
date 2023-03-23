/**
Copyright (c) 2022 ZOOMi Technologies Inc.

all rights reserved.

This source code is licensed under the license found in the
LICENSE file in the root directory of this source tree.
*/

import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { PropertyChangeDetection } from 'src/app/models/audit.model';
import { Shape } from 'src/app/models/shape.model';

@Injectable({
  providedIn: 'root'
})
export class FramePropertyService {
  private shapes: BehaviorSubject<Shape[]> = new BehaviorSubject<Shape[]>([]);
  private selectedBoxIndex: BehaviorSubject<number> = new BehaviorSubject<number>(0);
  private selectedBoxId: BehaviorSubject<number> = new BehaviorSubject<number>(0);
  private selectedLabel: BehaviorSubject<String> = new BehaviorSubject<String>('');
  private saved: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
  private items: BehaviorSubject<string[]> = new BehaviorSubject<string[]>([]);
  private labelObject: BehaviorSubject<any> = new BehaviorSubject<any>({});

  public deleteSelectedShapeEnable: BehaviorSubject<PropertyChangeDetection>;
  public onClicklabelEnable: BehaviorSubject<PropertyChangeDetection>;
  public setSelectedBoxLabelEnable: BehaviorSubject<PropertyChangeDetection>;
  public onChangeLabelEnable: BehaviorSubject<PropertyChangeDetection>;



  constructor() {
    this.deleteSelectedShapeEnable = new BehaviorSubject<PropertyChangeDetection>({
      isEnabled: false,
      params: null
    });
    this.onClicklabelEnable = new BehaviorSubject<PropertyChangeDetection>({
      isEnabled: false,
      params: null
    });
    this.setSelectedBoxLabelEnable = new BehaviorSubject<PropertyChangeDetection>({
      isEnabled: false,
      params: null
    });
    this.onChangeLabelEnable = new BehaviorSubject<PropertyChangeDetection>({
      isEnabled: false,
      params: null
    });
  }

  setShapes(shapes: Shape[]) {
    this.shapes.next(shapes);
  }

  getShapes(): Observable<Shape[]> {
    return this.shapes.asObservable();
  }

  setSelectedBoxIndex(selectedBoxIndex: number) {
    this.selectedBoxIndex.next(selectedBoxIndex);
  }

  getSelectedBoxIndex(): Observable<number> {
    return this.selectedBoxIndex.asObservable();
  }

  setSelectedLabel(selectedLabel: String) {
    this.selectedLabel.next(selectedLabel);
  }

  getSelectedLabel(): Observable<String> {
    return this.selectedLabel.asObservable();
  }

  // selected box id
  setSelectedBoxId(selectedBoxId: number) {
    this.selectedBoxId.next(selectedBoxId);
  }

  getSelectedBoxId(): Observable<number> {
    return this.selectedBoxId.asObservable();
  }

  // saved
  setSaved(saved: boolean) {
    this.saved.next(saved);
  }

  getSaved(): Observable<boolean> {
    return this.saved.asObservable();
  }

  // items
  setItems(items: string[]) {
    this.items.next(items);
  }

  getItems(): Observable<string[]> {
    return this.items.asObservable();
  }

  // items
  setLabelObject(labelObject: any) {
    this.labelObject.next(labelObject);
  }

  getLabelObject(): Observable<any> {
    return this.labelObject.asObservable();
  }

  deleteSelectedShape() {
    this.setDeleteSelectedShapeEnable(
      {
        isEnabled: true,
        params: null
      }
    );
  }
  onClicklabel() {
    this.setOnClicklabelEnable(
      {
        isEnabled: true,
        params: null
      }
    );
  }
  setSelectedBoxLabel(event: any) {
    this.setSelectedBoxLabelMethodEnable({
      isEnabled: true,
      params: {
        event: event
      }
    });

  }
  onChangeLabel(event: any, subLabelKey: string) {
    this.setOnChangeLabelEnable({
      isEnabled: true,
      params: {
        event: event,
        subLabelKey: subLabelKey
      }
    });
  }


  // deleteSelectedShapeEnable
  setDeleteSelectedShapeEnable(change: PropertyChangeDetection) {
    this.deleteSelectedShapeEnable.next(change);
  }

  getDeleteSelectedShapeEnable(): Observable<PropertyChangeDetection> {
    return this.deleteSelectedShapeEnable.asObservable();
  }



  /**
   * Set selected box label input event
   * @param event Set selected box label event
   */

  setOnClicklabelEnable(change: PropertyChangeDetection) {
    this.onClicklabelEnable.next(change);
  }

  /**
   * Get OnClicklabelEnable
   * @returns 
   */
  getOnClicklabelEnable(): Observable<PropertyChangeDetection> {

    return this.onClicklabelEnable.asObservable();
  }

  /**
  * setSelectedBoxLabelEnable
  */

  setSelectedBoxLabelMethodEnable(change: PropertyChangeDetection) {
    this.setSelectedBoxLabelEnable.next(change);
  }

  /**
   * Get setSelectedBoxLabelEnable
   * @returns 
   */
  getSelectedBoxLabelMethodEnable(): Observable<PropertyChangeDetection> {

    return this.setSelectedBoxLabelEnable.asObservable();
  }


  /**
 * set onChangeLabelEnable
 */

  setOnChangeLabelEnable(change: PropertyChangeDetection) {
    this.onChangeLabelEnable.next(change);
  }

  /**
   * Get onChangeLabelEnable
   * @returns 
   */
  getOnChangeLabelEnable(): Observable<PropertyChangeDetection> {
    return this.onChangeLabelEnable.asObservable();
  }



}
