/****************************************************************************
 Copyright (c) 2013-2014 Chukong Technologies Inc.
 http://www.cocos2d-x.org
 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated documentation files (the "Software"), to deal
 in the Software without restriction, including without limitation the rights
 to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 copies of the Software, and to permit persons to whom the Software is
 furnished to do so, subject to the following conditions:
 The above copyright notice and this permission notice shall be included in
 all copies or substantial portions of the Software.
 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 THE SOFTWARE.
 ****************************************************************************/

cc.LabelTTF._textAlign = ["left", "center", "right"];
cc.LabelTTF._textBaseline = ["top", "middle", "bottom"];

// Ensures punctuation marks after word are not wrapped.
cc.LabelTTF.wrapInspection = true;

// These regular expressions consider a word any sequence of characters
// from these Unicode (sub)blocks:
// - Basic Latin (letters and numbers, plus the hypen-minus '-')
// - Latin-1 Supplement (accentuated letters and ¿¡ only)
// - Latin Extended-A (complete)
// - Latin Extended-B (complete)
// - IPA Extensions (complete)
// - Spacing Modifier Letters (complete)
// - Combining Diacritical Marks (Combining Grapheme Joiner excluded)
// - Greek and Coptic (complete, including reserved code points)
// - Cyrillic (complete)
// - Cyrillic Supplement (complete)
// - General Punctuation (Non-Breaking Hyphen* [U+2011] and quotation marks)
// * Note that Hyphen [U+2010] is considered a word boundary.
cc.LabelTTF._wordRex = /([a-zA-Z0-9\-¿¡«À-ÖØ-öø-ʯ\u0300-\u034e\u0350-\u036FͰ-ԯ\u2011‵-‷‹⁅]+|\S)/;
cc.LabelTTF._symbolRex = /^[!,.:;}\]%\?>、‘“》»？。，！\u2010′-‴›‼⁆⁇-⁉]/;
cc.LabelTTF._lastWordRex = /([a-zA-Z0-9\-¿¡«À-ÖØ-öø-ʯ\u0300-\u034e\u0350-\u036FͰ-ԯ\u2011‵-‷‹⁅]+|\S)$/;
cc.LabelTTF._lastEnglish = /[a-zA-Z0-9\-¿¡«À-ÖØ-öø-ʯ\u0300-\u034e\u0350-\u036FͰ-ԯ\u2011‵-‷‹⁅]+$/;
cc.LabelTTF._firsrEnglish = /^[a-zA-Z0-9\-¿¡«À-ÖØ-öø-ʯ\u0300-\u034e\u0350-\u036FͰ-ԯ\u2011‵-‷‹⁅]/;
cc.LabelTTF._whitespace = /^[\s　]*/; // includes Ideographic Space

(function() {
    cc.LabelTTF.RenderCmd = function () {
        this._fontClientHeight = 18;
        this._fontStyleStr = "";
        this._shadowColorStr = "rgba(128, 128, 128, 0.5)";
        this._strokeColorStr = "";
        this._fillColorStr = "rgba(255,255,255,1)";

        this._labelCanvas = null;
        this._labelContext = null;
        this._lineWidths = [];
        this._strings = [];
        this._isMultiLine = false;
        this._status = [];
        this._renderingIndex = 0;
    };
    var proto = cc.LabelTTF.RenderCmd.prototype;
    proto.constructor = cc.LabelTTF.RenderCmd;

    proto._setFontStyle = function (fontNameOrFontDef, fontSize, fontStyle, fontWeight) {
        if(fontNameOrFontDef instanceof cc.FontDefinition){
            this._fontStyleStr = fontNameOrFontDef._getCanvasFontStr();
            this._fontClientHeight = cc.LabelTTF.__getFontHeightByDiv(fontNameOrFontDef);

        }else {
            var deviceFontSize = fontSize * cc.view.getDevicePixelRatio();
            this._fontStyleStr = fontStyle + " " + fontWeight + " " + deviceFontSize + "px '" + fontNameOrFontDef + "'";
            this._fontClientHeight = cc.LabelTTF.__getFontHeightByDiv(fontNameOrFontDef, fontSize);
        }
    };

    proto._getFontStyle = function () {
        return this._fontStyleStr;
    };

    proto._getFontClientHeight = function () {
        return this._fontClientHeight;
    };

    proto._updateColor = function(){
        this._setColorsString();
        this._updateTexture();
    };

    proto._setColorsString = function () {
        var locDisplayColor = this._displayedColor, node = this._node,
            locShadowColor = node._shadowColor || this._displayedColor;
        var locStrokeColor = node._strokeColor, locFontFillColor = node._textFillColor;
        var dr = locDisplayColor.r / 255, dg = locDisplayColor.g / 255, db = locDisplayColor.b / 255;

        this._shadowColorStr = "rgba(" + (0 | (dr * locShadowColor.r)) + "," + (0 | ( dg * locShadowColor.g)) + ","
            + (0 | (db * locShadowColor.b)) + "," + node._shadowOpacity + ")";
        this._fillColorStr = "rgba(" + (0 | (dr * locFontFillColor.r)) + "," + (0 | (dg * locFontFillColor.g)) + ","
            + (0 | (db * locFontFillColor.b)) + ", 1)";
        this._strokeColorStr = "rgba(" + (0 | (dr * locStrokeColor.r)) + "," + (0 | (dg * locStrokeColor.g)) + ","
            + (0 | (db * locStrokeColor.b)) + ", 1)";
    };

    proto._updateTTF = function () {
        var node = this._node;
        var locDimensionsWidth = node._dimensions.width * cc.view.getDevicePixelRatio(), i, strLength;
        var locLineWidth = this._lineWidths;
        locLineWidth.length = 0;

        this._isMultiLine = false;
        this._measureConfig();
        if (locDimensionsWidth !== 0) {
            // Content processing
            this._strings = node._string.split('\n');

            for (i = 0; i < this._strings.length; i++) {
                this._checkWarp(this._strings, i, locDimensionsWidth);
            }
        } else {
            this._strings = node._string.split('\n');
            for (i = 0, strLength = this._strings.length; i < strLength; i++) {
                locLineWidth.push(this._measure(this._strings[i]));
            }
        }

        if (this._strings.length > 1)
            this._isMultiLine = true;

        var locSize, locStrokeShadowOffsetX = 0, locStrokeShadowOffsetY = 0;
        if (node._strokeEnabled)
            locStrokeShadowOffsetX = locStrokeShadowOffsetY = node._strokeSize * 2;
        if (node._shadowEnabled) {
            var locOffsetSize = node._shadowOffset;
            locStrokeShadowOffsetX += Math.abs(locOffsetSize.x) * 2;
            locStrokeShadowOffsetY += Math.abs(locOffsetSize.y) * 2;
        }

        var pixelRatio = cc.view.getDevicePixelRatio();
        //get offset for stroke and shadow
        if (locDimensionsWidth === 0) {
            if (this._isMultiLine)
                locSize = cc.size(
                    Math.ceil(Math.max.apply(Math, locLineWidth) + locStrokeShadowOffsetX),
                    Math.ceil((this._fontClientHeight * pixelRatio * this._strings.length) + locStrokeShadowOffsetY));
            else
                locSize = cc.size(
                    Math.ceil(this._measure(node._string) + locStrokeShadowOffsetX),
                    Math.ceil(this._fontClientHeight * pixelRatio + locStrokeShadowOffsetY));
        } else {
            if (node._dimensions.height === 0) {
                if (this._isMultiLine)
                    locSize = cc.size(
                        Math.ceil(locDimensionsWidth + locStrokeShadowOffsetX),
                        Math.ceil((node.getLineHeight() * pixelRatio * this._strings.length) + locStrokeShadowOffsetY));
                else
                    locSize = cc.size(
                        Math.ceil(locDimensionsWidth + locStrokeShadowOffsetX),
                        Math.ceil(node.getLineHeight() * pixelRatio + locStrokeShadowOffsetY));
            } else {
                //dimension is already set, contentSize must be same as dimension
                locSize = cc.size(
                    Math.ceil(locDimensionsWidth + locStrokeShadowOffsetX),
                    Math.ceil(node._dimensions.height * pixelRatio + locStrokeShadowOffsetY));
            }
        }
        if(node._getFontStyle() !== "normal"){    //add width for 'italic' and 'oblique'
            locSize.width = Math.ceil(locSize.width + node._fontSize * 0.3);
        }
        node.setContentSize(locSize);
        node._strokeShadowOffsetX = locStrokeShadowOffsetX;
        node._strokeShadowOffsetY = locStrokeShadowOffsetY;

        // need computing _anchorPointInPoints
        var locAP = node._anchorPoint;
        this._anchorPointInPoints.x = (locStrokeShadowOffsetX * 0.5) + ((locSize.width - locStrokeShadowOffsetX) * locAP.x);
        this._anchorPointInPoints.y = (locStrokeShadowOffsetY * 0.5) + ((locSize.height - locStrokeShadowOffsetY) * locAP.y);
    };

    proto._saveStatus = function () {
        var node = this._node;
        var locStrokeShadowOffsetX = node._strokeShadowOffsetX, locStrokeShadowOffsetY = node._strokeShadowOffsetY;
        var locContentSizeHeight = node._contentSize.height - locStrokeShadowOffsetY, locVAlignment = node._vAlignment,
            locHAlignment = node._hAlignment;
        var dx = locStrokeShadowOffsetX * 0.5,
            dy = locContentSizeHeight + locStrokeShadowOffsetY * 0.5;
        var xOffset = 0, yOffset = 0, OffsetYArray = [];
        var locContentWidth = node._contentSize.width - locStrokeShadowOffsetX;

        //lineHeight
        var lineHeight = node.getLineHeight() * cc.view.getDevicePixelRatio();
        var transformTop = (lineHeight - this._fontClientHeight) / 2;

        if (locHAlignment === cc.TEXT_ALIGNMENT_RIGHT)
            xOffset += locContentWidth;
        else if (locHAlignment === cc.TEXT_ALIGNMENT_CENTER)
            xOffset += locContentWidth / 2;
        else
            xOffset += 0;

        if (this._isMultiLine) {
            var locStrLen = this._strings.length;
            if (locVAlignment === cc.VERTICAL_TEXT_ALIGNMENT_BOTTOM)
                yOffset = lineHeight - transformTop * 2 + locContentSizeHeight - lineHeight * locStrLen;
            else if (locVAlignment === cc.VERTICAL_TEXT_ALIGNMENT_CENTER)
                yOffset = (lineHeight - transformTop * 2) / 2 + (locContentSizeHeight - lineHeight * locStrLen) / 2;

            for (var i = 0; i < locStrLen; i++) {
                var tmpOffsetY = -locContentSizeHeight + (lineHeight * i + transformTop) + yOffset;
                OffsetYArray.push(tmpOffsetY);
            }
        } else {
            if (locVAlignment === cc.VERTICAL_TEXT_ALIGNMENT_BOTTOM) {
                //do nothing
            } else if (locVAlignment === cc.VERTICAL_TEXT_ALIGNMENT_TOP) {
                yOffset -= locContentSizeHeight;
            } else {
                yOffset -= locContentSizeHeight * 0.5;
            }
            OffsetYArray.push(yOffset);
        }
        var tmpStatus = {
            contextTransform:cc.p(dx,dy),
            xOffset:xOffset,
            OffsetYArray:OffsetYArray
        };
        this._status.push(tmpStatus);
    };

    proto._drawTTFInCanvas = function (context) {
        if (!context)
            return;
        var locStatus = this._status.pop();
        context.setTransform(1, 0, 0, 1, locStatus.contextTransform.x, locStatus.contextTransform.y);
        var xOffset = locStatus.xOffset;
        var yOffsetArray = locStatus.OffsetYArray;
        this.drawLabels(context, xOffset, yOffsetArray);
    };

    proto._checkWarp = function (strArr, i, maxWidth) {
        var text = strArr[i];
        var allWidth = this._measure(text);
        if (allWidth > maxWidth && text.length > 1) {
            // Attempt to guess how many characters fit in the first line
            var fuzzyLen = text.length * ( maxWidth / allWidth ) | 0;
            var tmpText = text.substr(fuzzyLen);
            var width = allWidth - this._measure(tmpText);
            var sLine = tmpText;
            var pushNum = 0;

            // Increased while looping, up to 100 times
            var checkWhile = 0;

            // Contraction phase:
            // If we guessed too bing, try with less characters
            while (width > maxWidth && checkWhile++ < 100) {
                fuzzyLen *= maxWidth / width;
                fuzzyLen = fuzzyLen | 0;
                tmpText = text.substr(fuzzyLen);
                width = allWidth - this._measure(tmpText);
            }

            checkWhile = 0;

            // Expansion phase:
            // Keep adding words until no more fit in the line
            while (width < maxWidth && checkWhile++ < 100) {
                if (tmpText) {
                    var exec = cc.LabelTTF._wordRex.exec(tmpText);
                    pushNum = exec ? exec[0].length : 1;
                    sLine = tmpText;
                }

                fuzzyLen = fuzzyLen + pushNum;
                tmpText = text.substr(fuzzyLen);
                width = allWidth - this._measure(tmpText);
            }

            // Remove the last word in the previous loop, as it overflew
            fuzzyLen -= pushNum;
            if (fuzzyLen === 0) {
                fuzzyLen = 1;
                sLine = sLine.substr(1);
            }

            // sText is the text that will make it into the first line.
            // sLine is the remaining text, that will go into the next lines.
            // result is just a temporary variable for regexp matching results.
            var sText = text.substr(0, fuzzyLen), result;

            if (cc.LabelTTF.wrapInspection) {
                // If the remaining text starts with symbol
                if (cc.LabelTTF._symbolRex.test(sLine)) {
                    // Remove the last word so it is placed in the next line instead
                    result = cc.LabelTTF._lastWordRex.exec(sText);
                    fuzzyLen -= result ? result[0].length : 0;
                    if (fuzzyLen === 0) fuzzyLen = 1;

                    sLine = text.substr(fuzzyLen);
                    sText = text.substr(0, fuzzyLen);
                }
            }

            // To judge whether words are truncated:
            // fuzzyLen may have got a value such that we're truncating a word
            // (examine the case where it falls at the middle of a word and no
            // more words are added).
            if (cc.LabelTTF._firsrEnglish.test(sLine)) {
                result = cc.LabelTTF._lastEnglish.exec(sText);
                // If sText ends in letter and sLine starts in letter, we've
                // truncated a word. The right part does not fit (otherwise
                // it would have been added in the expansion phase), so we
                // remove also the left part so both are printed in the next line.
                if (result && sText !== result[0]) {
                    fuzzyLen -= result[0].length;
                    sLine = text.substr(fuzzyLen);
                    sText = text.substr(0, fuzzyLen);
                }
            }

            // Eat as much whitespace as possible from the beginning of the next
            // line.
            result = cc.LabelTTF._whitespace.exec(sLine);
            sLine = sLine.substr(result[0].length);

            strArr[i] = sLine;
            strArr.splice(i, 0, sText);
        }
    };

    proto.updateStatus = function () {
        var flags = cc.Node._dirtyFlags, locFlag = this._dirtyFlag;

        cc.Node.RenderCmd.prototype.updateStatus.call(this);
        
        if (locFlag & flags.textDirty)
            this._updateTexture();

        if (this._dirtyFlag & flags.transformDirty){
            this.transform(this.getParentRenderCmd(), true);
            this._dirtyFlag = this._dirtyFlag & cc.Node._dirtyFlags.transformDirty ^ this._dirtyFlag;
        }
    };

    proto._syncStatus = function (parentCmd) {
        var flags = cc.Node._dirtyFlags, locFlag = this._dirtyFlag;
        
        cc.Node.RenderCmd.prototype._syncStatus.call(this, parentCmd);
        
        if (locFlag & flags.textDirty)
            this._updateTexture();

        if (cc._renderType === cc.game.RENDER_TYPE_WEBGL || locFlag & flags.transformDirty)
            this.transform(parentCmd);
    };

    proto.drawLabels = function (context, xOffset, yOffsetArray) {
        var node = this._node;
        //shadow style setup
        if (node._shadowEnabled) {
            var locShadowOffset = node._shadowOffset;
            context.shadowColor = this._shadowColorStr;
            context.shadowOffsetX = locShadowOffset.x;
            context.shadowOffsetY = -locShadowOffset.y;
            context.shadowBlur = node._shadowBlur;
        }

        var locHAlignment = node._hAlignment,
            locVAlignment = node._vAlignment,
            locStrokeSize = node._strokeSize;

        //this is fillText for canvas
        if (context.font !== this._fontStyleStr)
            context.font = this._fontStyleStr;
        context.fillStyle = this._fillColorStr;

        //stroke style setup
        var locStrokeEnabled = node._strokeEnabled;
        if (locStrokeEnabled) {
            context.lineWidth = locStrokeSize * 2;
            context.strokeStyle = this._strokeColorStr;
        }

        context.textBaseline = cc.LabelTTF._textBaseline[locVAlignment];
        context.textAlign = cc.LabelTTF._textAlign[locHAlignment];

        var locStrLen = this._strings.length;
        for (var i = 0; i < locStrLen; i++) {
            var line = this._strings[i];
            if (locStrokeEnabled)
                context.strokeText(line, xOffset, yOffsetArray[i]);
            context.fillText(line, xOffset, yOffsetArray[i]);
        }
        cc.g_NumberOfDraws++;
    };
})();

(function(){
    cc.LabelTTF.CacheRenderCmd = function (renderable) {
        cc.LabelTTF.RenderCmd.call(this,renderable);
        var locCanvas = this._labelCanvas = document.createElement("canvas");
        locCanvas.width = 1;
        locCanvas.height = 1;
        this._labelContext = locCanvas.getContext("2d");
    };

    cc.LabelTTF.CacheRenderCmd.prototype = Object.create( cc.LabelTTF.RenderCmd.prototype);
    cc.inject(cc.LabelTTF.RenderCmd.prototype, cc.LabelTTF.CacheRenderCmd.prototype);

    var proto = cc.LabelTTF.CacheRenderCmd.prototype;
    proto.constructor = cc.LabelTTF.CacheRenderCmd;

    proto._updateTexture = function () {
        this._dirtyFlag = this._dirtyFlag & cc.Node._dirtyFlags.textDirty ^ this._dirtyFlag;
        var node = this._node;
        var locContentSize = node._contentSize;
        this._updateTTF();
        var width = locContentSize.width, height = locContentSize.height;

        var locContext = this._labelContext, locLabelCanvas = this._labelCanvas;

        if(!node._texture){
            var labelTexture = new cc.Texture2D();
            labelTexture.initWithElement(this._labelCanvas);
            node.setTexture(labelTexture);
        }

        if (node._string.length === 0) {
            locLabelCanvas.width = 1;
            locLabelCanvas.height = locContentSize.height || 1;
            node._texture && node._texture.handleLoadedTexture();
            node.setTextureRect(cc.rect(0, 0, 1, locContentSize.height));
            return true;
        }

        //set size for labelCanvas
        locContext.font = this._fontStyleStr;

        var flag = locLabelCanvas.width === width && locLabelCanvas.height === height;
        locLabelCanvas.width = width;
        locLabelCanvas.height = height;
        if (flag) locContext.clearRect(0, 0, width, height);
        this._saveStatus();
        this._drawTTFInCanvas(locContext);
        node._texture && node._texture.handleLoadedTexture();
        node.setTextureRect(cc.rect(0, 0, width, height));
        return true;
    };

    proto._measureConfig = function () {
        this._labelContext.font = this._fontStyleStr;
    };

    proto._measure = function (text) {
        return this._labelContext.measureText(text).width;
    };

})();

(function(){
    cc.LabelTTF.CacheCanvasRenderCmd = function (renderable) {
        cc.Sprite.CanvasRenderCmd.call(this, renderable);
        cc.LabelTTF.CacheRenderCmd.call(this);
    };

    var proto = cc.LabelTTF.CacheCanvasRenderCmd.prototype = Object.create(cc.Sprite.CanvasRenderCmd.prototype);
    cc.inject(cc.LabelTTF.CacheRenderCmd.prototype, proto);
    proto.constructor = cc.LabelTTF.CacheCanvasRenderCmd;
})();

(function(){
    cc.LabelTTF.CanvasRenderCmd = function (renderable) {
        cc.Sprite.CanvasRenderCmd.call(this, renderable);
        cc.LabelTTF.RenderCmd.call(this);
    };

    cc.LabelTTF.CanvasRenderCmd.prototype = Object.create(cc.Sprite.CanvasRenderCmd.prototype);
    cc.inject(cc.LabelTTF.RenderCmd.prototype, cc.LabelTTF.CanvasRenderCmd.prototype);

    var proto = cc.LabelTTF.CanvasRenderCmd.prototype;
    proto.constructor = cc.LabelTTF.CanvasRenderCmd;

    proto._measureConfig = function () {};

    proto._measure = function (text) {
        var context = cc._renderContext.getContext();
        context.font = this._fontStyleStr;
        return context.measureText(text).width;
    };

    proto._updateTexture = function () {
        this._dirtyFlag = this._dirtyFlag & cc.Node._dirtyFlags.textDirty ^ this._dirtyFlag;
        var node = this._node;
        var locContentSize = node._contentSize;
        this._updateTTF();
        var width = locContentSize.width, height = locContentSize.height;
        if (node._string.length === 0) {
            node.setTextureRect(cc.rect(0, 0, 1, locContentSize.height));
            return true;
        }
        this._saveStatus();
        node.setTextureRect(cc.rect(0, 0, width, height));
        return true;
    };

    proto.rendering = function(ctx) {
        var scaleX = cc.view.getScaleX(),
            scaleY = cc.view.getScaleY();
        var wrapper = ctx || cc._renderContext, context = wrapper.getContext();
        if (!context)
            return;
        var node = this._node;
        wrapper.computeRealOffsetY();
        if(this._status.length <= 0)
            return;
        var locIndex = (this._renderingIndex >= this._status.length)? this._renderingIndex-this._status.length:this._renderingIndex;
        var status = this._status[locIndex];
        this._renderingIndex = locIndex+1;

        var locHeight = node._rect.height,
            locX = node._offsetPosition.x,
            locY = -node._offsetPosition.y - locHeight;

        var alpha = (this._displayedOpacity / 255);

        wrapper.setTransform(this._worldTransform, scaleX, scaleY);
        wrapper.setCompositeOperation(this._blendFuncStr);
        wrapper.setGlobalAlpha(alpha);

        wrapper.save();

        if (node._flippedX) {
            locX = -locX - node._rect.width;
            context.scale(-1, 1);
        }
        if (node._flippedY) {
            locY = node._offsetPosition.y;
            context.scale(1, -1);
        }

        var xOffset = status.xOffset + status.contextTransform.x + locX * scaleX;
        var yOffsetArray = [];

        var locStrLen = this._strings.length;
        for (var i = 0; i < locStrLen; i++)
            yOffsetArray.push(status.OffsetYArray[i] + status.contextTransform.y + locY * scaleY);

        this.drawLabels(context, xOffset, yOffsetArray);
        wrapper.restore();
    };
})();