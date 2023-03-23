/**
Copyright (c) 2022 ZOOMi Technologies Inc.

all rights reserved.

This source code is licensed under the license found in the
LICENSE file in the root directory of this source tree.
*/

export class PromptMesseges {
  public static readonly manage_team_delete_member =
    'Do you need to delete this member?';

  public static readonly manage_team_deactivate_member =
    'Do you need to deactivate this member?';

  public static readonly missing_frames_annotator =
    'You have missed some frames to annotate, Are you sure you want to complete it without annotating?';
  public static readonly missing_frames_auditor =
    'You have missed some frames to review, Are you sure you want to complete it without reviewing?';

  public static readonly skip_frame_messege =
    'Are you sure you want to SKIP this frame without mark any Bounding Box?';
  public static readonly skip_frame_question = 'Reason to skip';
  public static readonly skip_frame_reason = 'No objects in this screen';

  public static readonly document_upload_failed =
    'Document upload failed! Please try again.';

  public static readonly augmentation_delete =
    'Do you want to delete this augmentation?';
}
export function convertClassToObject(classObject: any) {
  let objectString = JSON.stringify({ ...classObject });
  return JSON.parse(objectString);
}
