import graphicGL from '../../util/graphicGL';
import verticesSortMixin from '../../util/geometry/verticesSortMixin';
import * as echarts from 'echarts/lib/echarts';
import glmatrix from 'claygl/src/dep/glmatrix';
var vec4 = glmatrix.vec4;

import sdfSpriteGLSL from './sdfSprite.glsl.js';
graphicGL.Shader.import(sdfSpriteGLSL);

var PointsMesh = graphicGL.Mesh.extend(function () {
    var geometry = new graphicGL.Geometry({
        dynamic: true,
        attributes: {
            color: new graphicGL.Geometry.Attribute('color', 'float', 4, 'COLOR'),
            position: new graphicGL.Geometry.Attribute('position', 'float', 3, 'POSITION'),
            size: new graphicGL.Geometry.Attribute('size', 'float', 1),
            prevPosition: new graphicGL.Geometry.Attribute('prevPosition', 'float', 3),
            prevSize: new graphicGL.Geometry.Attribute('prevSize', 'float', 1)
        }
    });
    Object.assign(geometry, verticesSortMixin);

    var material = new graphicGL.Material({
        shader: graphicGL.createShader('ecgl.sdfSprite'),
        transparent: true,
        depthMask: false
    });
    material.enableTexture('sprite');
    material.define('both', 'VERTEX_COLOR');
    material.define('both', 'VERTEX_SIZE');

    var sdfTexture = new graphicGL.Texture2D({
        image: document.createElement('canvas'),
        flipY: false
    });

    material.set('sprite', sdfTexture);

    // Custom pick methods.
    geometry.pick = this._pick.bind(this);

    return {
        geometry: geometry,
        material: material,
        mode: graphicGL.Mesh.POINTS,

        sizeScale: 1
    };
}, {

    _pick: function (x, y, renderer, camera, renderable, out) {
        var positionNDC = this._positionNDC;
        if (!positionNDC) {
            return;
        }

        var viewport = renderer.viewport;
        var ndcScaleX = 2 / viewport.width;
        var ndcScaleY = 2 / viewport.height;
        // From near to far. indices have been sorted.
        for (var i = this.geometry.vertexCount - 1; i >= 0; i--) {
            var idx;
            if (!this.geometry.indices) {
                idx = i;
            }
            else {
                idx = this.geometry.indices[i];
            }

            var cx = positionNDC[idx * 2];
            var cy = positionNDC[idx * 2 + 1];

            var size = this.geometry.attributes.size.get(idx) / this.sizeScale;
            var halfSize = size / 2;

            if (
                x > (cx - halfSize * ndcScaleX) && x < (cx + halfSize * ndcScaleX)
                && y > (cy - halfSize * ndcScaleY) && y < (cy + halfSize * ndcScaleY)
            ) {
                var point = new graphicGL.Vector3();
                var pointWorld = new graphicGL.Vector3();
                this.geometry.attributes.position.get(idx, point.array);
                graphicGL.Vector3.transformMat4(pointWorld, point, this.worldTransform);
                out.push({
                    vertexIndex: idx,
                    point: point,
                    pointWorld: pointWorld,
                    target: this,
                    distance: pointWorld.distance(camera.getWorldPosition())
                });
            }
        }
    },

    updateNDCPosition: function (worldViewProjection, is2D, api) {
        var positionNDC = this._positionNDC;
        var geometry = this.geometry;
        if (!positionNDC || positionNDC.length / 2 !== geometry.vertexCount) {
            positionNDC = this._positionNDC = new Float32Array(geometry.vertexCount * 2);
        }
        // 参考网址：github仓库怎么同步npm：https://www.baidu.com/s?ie=utf-8&f=8&rsv_bp=1&tn=baidu&wd=github仓库怎么同步npm

        // ////// --- new1：通过这里，将positionNDC信息放出来，实现三维坐标转为二维坐标
        // // console.log('PointsMesh.js ==> updateNDCPosition | api', api);
        // api.getPositionNDC = function () {
        //     return [].concat(...positionNDC);
        // }

        ////// --- new3：通过这里，并通过index将position2d信息放出来（函数内部已实现三维坐标转为二维坐标）
        api.get2dPositionByIndex = function (index) {
            const _tempArr = [].concat(...positionNDC);
            return [ // canvas元素的原点位置(0,0)为其左上角
                // 参考网址：视口变换：https://blog.csdn.net/qq_33060405/article/details/144596384
                ((_tempArr[index * 2] + 1) / 2) * api.getWidth(),
                ((1 - _tempArr[index * 2 + 1]) / 2) * api.getHeight()
            ];
        }

        var pos = vec4.create();
        for (var i = 0; i < geometry.vertexCount; i++) {
            geometry.attributes.position.get(i, pos);
            pos[3] = 1;
            vec4.transformMat4(pos, pos, worldViewProjection.array);
            vec4.scale(pos, pos, 1 / pos[3]);

            positionNDC[i * 2] = pos[0];
            positionNDC[i * 2 + 1] = pos[1];
        }
    }
});

export default PointsMesh;