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

export const EmailConfig = {
  SHOW_EMAIL: process.env.SUPPORT_EMAIL
}

export const SendGridEmailConfig = {
  API_KEY: process.env.SENDGRID_API_KEY,
}

