<script setup>
import { onMounted, ref, computed } from "vue";
import zhCN from "ant-design-vue/es/locale/zh_CN";
import dayjs from "dayjs";
import "dayjs/locale/zh-cn";
dayjs.locale("zh-cn");
import {
  OcrBaiduApi,
  getImageListApi,
  saveImageOrcApi,
  exportApi,
} from "./api.js";
import { changeSizeFunc } from "./size.js";
import { drawItem, removeItem, clearCanvas } from "./draw.js";
import { message, Spin, Radio, RadioGroup } from "ant-design-vue";
const canvas = ref(null);
const currentDay = ref(dayjs("2025-08-14").format("YYYY-MM-DD"));
const ratio = ref(1); // 比例
const rotateValue = ref(0); // 旋转角度
const loading = ref(false); // 加载
const currentPage = ref(1); // 当前页
const size = ref(1); // 每页大小
const totalPage = ref(1); // 总页数
const imageList = ref([]); // 图片列表
const currentImage = ref({}); // 当前图片
const resultList = ref([]); // 结果列表
const currentResult = ref([]); // 当前结果
const ocrType = ref("BAI_DU"); // OCR识别类型 百度或讯飞

const customNumber = ref();

const bodyRotateClass = computed(() => {
  return `rotate-${rotateValue.value}`;
});

// 格式化orc识别结果
const filterOcrData = (data) => {
  return data.map((item) => {
    return {
      ...item,
      ocrText: item.text,
    };
  });
};
/**
 * 加载当前角度数据，根据ocr类型
 */
const handleLoadOcr = () => {
  // if (ocrType.value === "BAI_DU") {
  //   currentResult.value = filterOcrData(currentImage.value.baiduOcr || []);
  // } else {
  //   currentResult.value = filterOcrData(currentImage.value.xunfeiOcr || []);
  // }
  // resultList.value[currentPage.value] = currentResult.value;
  // filterData(currentResult.value);
  setCurrentImageOcr()
};
// 设置当前图片对应的orc识别结果
// 如果有保存结果，取保存结果
// To Do 如果没有baiduOcr与xunfeiOcr的话，需要调用结果获取
const setCurrentImageOcr = (isOcrType = true) => {
  console.log(currentImage.value, "当前图片");
  if (currentImage.value?.result && !isOcrType) {
    currentResult.value = currentImage.value.result.map((item) => {
      return {
        location: item.location,
        confidence: item.confidence,
        text: item.boxID,
        ocrText: item.ocrText,
      };
    });
    // 设置保存的类型
    ocrType.value = currentImage.value.result[0].vendor;
  } else if (ocrType.value === "BAI_DU") {
    currentResult.value = filterOcrData(currentImage.value.baiduOcr || []);
  } else {
    currentResult.value = filterOcrData(currentImage.value.xunfeiOcr || []);
  }
  console.log(currentResult.value);
  if (currentResult.value) {
    resultList.value[currentPage.value] = currentResult.value;
    filterData(currentResult.value);
    loading.value = false;
  } else {
    const params = {
      sourceId: currentImage.value?.sourceId,
      imageUrl: currentImage.value?.imageUrl,
      vendor: ocrType.value,
    };
    OcrBaiduApi(params)
      .then((res) => {
        console.log(res, "--");
        currentResult.value = filterOcrData(res);
        filterData(currentResult.value);
        loading.value = false;
      })
      .finally(() => {
        loading.value = false;
      });
  }
};

// 切换ocr识别类型
const handleOcrTypeChange = () => {
  setCurrentImageOcr();
};

// 图片加载失败
const onImageError = (e) => {
  loading.value = false;
};

// 图片加载后设置canvas大小
const onImageLoad = (e) => {
  const img = e.target;
  canvas.value.width = img.width;
  canvas.value.height = img.height;
  canvas.value.style.width = `${img.width}px`;
  canvas.value.style.height = `${img.height}px`;
  // img宽高除以原始宽高
  ratio.value = img.width / img.naturalWidth;
  console.log(img.width,img.naturalWidth,'狂高')
  setCurrentImageOcr(false);
};

/**
 * 画所有的框
 * @param data 框信息列表
 */
const drawAll = (data) => {
  clearCanvas(canvas.value);
  data.forEach((item) => {
    drawItem(item.vertices, canvas.value);
  });
};

/**
 * 格式化数据，且调用画框方法
 */
const filterData = (arr) => {
  const newData = arr
    .filter((item) => {
      return !!item.location?.vertices;
    })
    .map((item) => {
      const { vertices } = item.location;
      return {
        vertices: changeSizeFunc(ratio.value, vertices),
      };
    });
  drawAll(newData);
};

/**
 * 旋转角度
 */
const handleToChange = () => {
  rotateValue.value = (rotateValue.value + 90) % 360;
};

/**
 * 重置当前结果
 */
const resetCurrentResult = () => {
  resultList.value = [];
  currentResult.value = [];
  currentImage.value = {};
};

/**
 * 设置当前图片
 */
const setCurrentImage = () => {
  currentImage.value = imageList.value[currentPage.value - 1];
};
/**
 * 获取图片列表
 */
const getImageList = () => {
  const params = {
    statisDay: currentDay.value,
    page: currentPage.value,
    size: size.value,
  };
  resetCurrentResult();
  clearCanvas(canvas.value);
  loading.value = true;
  getImageListApi(params).then((res) => {
    const currentItem = res.list[0];
    imageList.value[currentPage.value - 1] = currentItem;
    totalPage.value = res?.total;
    if (imageList.value.length) {
      setCurrentImage();
    }
  });
};

/**
 * 上一页
 */
const handlePrev = () => {
  if (currentPage.value > 1) {
    currentPage.value--;
    setCurrentImage();
  }
};
/**
 * 下一页
 */
const handleNext = () => {
  if (currentPage.value < totalPage.value) {
    currentPage.value++;
    if (imageList.value[currentPage.value - 1]) {
      setCurrentImage();
    } else {
      getImageList();
    }
  }
};

/**
 * 保存图片识别结果
 */
const saveImageOrc = (cb) => {
  const sourceId = currentImage.value?.sourceId;
  const imageUrl = currentImage.value?.imageUrl;
  const results = currentResult.value;
  const params = {
    sourceId,
    imageUrl,
    result: results.map((item) => {
      return {
        boxID: item?.text,
        ocrText: item?.ocrText,
        confidence: item?.confidence,
        vendor: ocrType.value,
        location: item?.location,
      };
    }),
  };
  saveImageOrcApi(params).then((res) => {
    message.success("保存成功");
    cb && cb(params.result);
  });
};

/**
 * 设置 编辑状态
 */
const setEditStatus = (index, status) => {
  currentResult.value = currentResult.value.map((it, ix) => {
    return {
      ...it,
      isEdit: ix === index ? status : false,
    };
  });
};

/**
 * 设置当前编辑框
 */
const setEditItemDraw = (item, color) => {
  if (item.location?.vertices) {
    // 清除当前编辑的位置
    const vertices = changeSizeFunc(ratio.value, item.location?.vertices);
    removeItem(vertices, canvas.value);
    drawItem(vertices, canvas.value, color);
  }
};

/**
 * 编辑图片识别结果
 */
const handleEdit = (index) => {
  const item = currentResult.value[index];
  if (item.isEdit) {
    // 保存,之后把最新的数据保存到列表中
    saveImageOrc((newResults) => {
      currentImage.value.result = newResults;
      imageList.value[currentPage.value - 1].result = newResults;
      setEditStatus(index, false);
      setEditItemDraw(item, "green");
    });
  } else {
    setEditStatus(index, true);
    setEditItemDraw(item, "red");
  }
};

/**
 * 重置所有配置
 */
const resetAllConfig = () => {
  currentPage.value = 1;
  totalPage.value = 1;
  imageList.value = [];
  currentImage.value = {};
  resultList.value = [];
  currentResult.value = [];
};

/**
 * 加载选择日期数据
 */
const handleLoadDay = () => {
  resetAllConfig();
  getImageList();
};

/**
 * 手动添加一条
 */
const handleCustomAdd = () => {
  currentResult.value.push({
    text: customNumber.value,
    location: {},
  });
  customNumber.value = null;
  saveImageOrc((newResults) => {
    currentImage.value.result = newResults;
    imageList.value[currentPage.value - 1].result = newResults;
  });
};

/**
 * 导出结果
 */
const handleExport = () => {
  const params = {
    statisDay: currentDay.value,
    currentPage: currentPage.value,
  };
  exportApi(params);
};

onMounted(() => {
  getImageList();
});
</script>

<template>
  <a-config-provider :locale="zhCN">
    <div class="container-box">
      <div class="container">
        <div class="control-list">
          <div class="control-item">
            <a-date-picker
              value-format="YYYY-MM-DD"
              v-model:value="currentDay"
              format="YYYY-MM-DD"
            />
            <a-button class="control-btn" @click="handleLoadDay"
              >加载当天</a-button
            >
          </div>

          <div class="control-item">
            <div class="ocr-type">OCR识别：</div>
            <a-radio-group
              @change="handleOcrTypeChange"
              v-model:value="ocrType"
              button-style="solid"
            >
              <a-radio-button value="BAI_DU">百度</a-radio-button>
              <a-radio-button value="XUN_FEI">讯飞</a-radio-button>
            </a-radio-group>
          </div>
        </div>

        <div class="body" id="body">
          <div class="body-content" :class="bodyRotateClass">
            <!-- <img
              class="body-content-img"
              :src="currentImage?.imageUrl"
              @load="onImageLoad"
              @error="onImageError"
              alt=""
            /> -->
            <img
              class="body-content-img"
              src="/img/1.png"
              @load="onImageLoad"
              @error="onImageError"
              alt=""
            />
            <canvas ref="canvas" class="body-content-canvas"></canvas>
          </div>
        </div>

        <div class="control-list">
          <div class="control-item">
            <div class="ratio-value">{{ rotateValue }}°</div>
            <a-button class="control-btn" @click="handleToChange"
              >右转90°</a-button
            >
            <a-button class="control-btn" @click="handleLoadOcr"
              >加载当前角度数据</a-button
            >
          </div>
          <div class="control-item">
            <a-button class="control-btn" @click="handlePrev">上一页</a-button>
            <div class="pagination-value">
              {{ currentPage }}/{{ totalPage || 1 }}
            </div>
            <a-button class="control-btn" @click="handleNext">下一页</a-button>
          </div>

          <div class="control-item">
            <a-button class="control-btn" @click="handleExport">导出数据</a-button >
          </div>

          
        </div>
      </div>
      <div class="result-list">
        <div
          class="result-item"
          v-for="(item, index) in currentResult"
          :key="index"
        >
          <a-input
            :disabled="!item.isEdit"
            v-model:value="item.text"
            placeholder="手动新增编号"
          />
          <a-button class="control-btn" @click="handleEdit(index)">
            {{ item.isEdit ? "保存" : "编辑" }}
          </a-button>
        </div>
        <div class="result-item">
            <a-input v-model:value="customNumber" placeholder="手动新增编号" />
            <a-button class="control-btn" @click="handleCustomAdd"
              >手动添加</a-button
            >
          </div>
      </div>

      <div class="loading-box" v-if="loading">
        <Spin />
      </div>
    </div>
  </a-config-provider>
</template>

<style lang="less" scoped>
.container-box {
  width: 100vw;
  height: 100vh;
  display: flex;
  justify-content: center;
  min-width: calc(1000px + 12rem);
  .loading-box {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(255, 255, 255, 0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    color: white;
  }
  .result-list {
    padding-top: 4rem;
    box-sizing: border-box;
    width: 246px;
    margin-left: 10px;
    .result-item {
      display: flex;
      align-items: center;
      margin-bottom: 10px;

      .control-btn {
        margin-left: 10px;
      }
    }
  }
}
.container {
  position: relative;

  .control-btn {
    margin-left: 6px;
  }

  .body {
    width: 1000px;
    height: 600px;
    background-color: rgba(0, 0, 0, 0.1);
    overflow: auto;
    position: relative;
    .body-content {
      position: relative;
      transform-origin: top left;
      .body-content-img {
        display: block;
        width: 1000px;
        height: 600px;
        object-fit: contain;
      }
      .body-content-canvas {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
      }

      &.rotate-90 {
        transform: rotate(90deg);
      }
      &.rotate-180 {
        transform: rotate(180deg);
      }
      &.rotate-270 {
        transform: rotate(270deg);
      }
    }
  }

  .control-list {
    margin: 1rem 0rem;
    width: 1000px;
    display: flex;
    align-items: center;
    .control-item {
      display: flex;
      align-items: center;
      margin-right: 1rem;
    }
    .ratio-value {
      color: black;
    }

    .pagination-value {
      display: flex;
      margin-left: 6px;
    }
  }
}
</style>
