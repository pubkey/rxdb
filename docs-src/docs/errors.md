---
title: Error Messages
slug: errors.html
description: Learn how RxDB throws RxErrors with codes and parameters. Keep builds lean, yet unveil full messages in development via the DevMode plugin.
image: /headers/errors.jpg
---


# RxDB Error Messages

When RxDB has an error, an `RxError` object is thrown instead of a normal JavaScript `Error`. This `RxError` contains additional properties such as a `code` field and `parameters`. By default the full human readable error messages are not included into the RxDB build. This is because error messages have a high entropy and cannot be compressed well. Therefore only an error message with the correct error-code and parameters is thrown but without the full text.
When you enable the [DevMode Plugin](./dev-mode.md) the full error messages are added to the `RxError`. This should only be done in development, not in production builds to keep a small build size.


## All RxDB error messages

import { ErrorMessages } from '@site/src/components/error-messages';

<ErrorMessages></ErrorMessages>
