/**
Copyright (c) 2022 ZOOMi Technologies Inc.

all rights reserved.

This source code is licensed under the license found in the
LICENSE file in the root directory of this source tree.
*/

import { Comment } from "./comment.model";

export class CommentBox {
    id!: number;
    isResolved!: boolean;
    createdBy!: string;
    commentBoxTop!: number;
    commentBoxLeft!: number;
    commentList!: Array<Comment>;
    isPermanent?: boolean | false;

    constructor() {
        this.isResolved = false;
        this.commentList = [];
        this.isPermanent = false;

    }
}

