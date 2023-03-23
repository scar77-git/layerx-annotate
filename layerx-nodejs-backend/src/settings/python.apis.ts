/*
 * Copyright (c) 2022 ZOOMi Technologies Inc.
 *
 * all rights reserved.
 *
 * This source code is licensed under the license found in the LICENSE file in the root directory of this source tree.
 *
 */
import dotenv from 'dotenv';
dotenv.config()


export const PythonServer = {

  baseUrl: process.env.PYTHON_BASE_URL ?? 'http://localhost:8081',
  authKey: 'ZOOMI-ANNO_TOOL_EupRMda1RzHobazafFVzTut0h40GfVttGSOJy9IvsTT2z8vcqTgYleZMbgC9nXozjQ',
};
