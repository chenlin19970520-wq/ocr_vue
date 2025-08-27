<script setup>
import { onMounted, ref, computed, nextTick } from "vue";
import { ExclamationCircleOutlined } from "@ant-design/icons-vue";
import zhCN from "ant-design-vue/es/locale/zh_CN";
import dayjs from "dayjs";
import "dayjs/locale/zh-cn";
dayjs.locale("zh-cn");
import {
  OcrBaiduApi,
  getImageListApi,
  saveImageOrcApi,
  exportApi,
  getAuthApi,
} from "./api.js";
import { changeSizeFunc } from "./size.js";
import { drawItem, removeItem, clearCanvas } from "./draw.js";
import {
  message,
  Spin,
  Radio,
  RadioGroup,
  Popconfirm as APopconfirm,
} from "ant-design-vue";
const canvas = ref(null);
const currentDay = ref(dayjs().format("YYYY-MM-DD"));
const ratio = ref(1); // 比例
const rotateValue = ref(0); // 旋转角度
const scale = ref(1); // 缩放比例
const loading = ref(false); // 加载
const currentPage = ref(1); // 当前页
const jumpPageNumber = ref(null); // 跳转页
const size = ref(1); // 每页大小
const totalPage = ref(1); // 总页数
const imageList = ref([]); // 图片列表
const currentImage = ref({}); // 当前图片
const resultList = ref([]); // 结果列表
const currentResult = ref([]); // 当前结果
const ocrType = ref("BAI_DU"); // OCR识别类型 百度或讯飞
const sessionKey = ref(); // key
const bodySize = ref({
  width: 0,
  height: 0,
}); // 滚动框的大小

const customNumber = ref();

const transform = computed(() => {
  return `rotate(${rotateValue.value}deg) scale(${scale.value})`;
});

const showCurrentResult = computed(() => {
  return currentResult.value.filter((item) => {
    return item.text !== "__NO_OCR_RESULT__";
  });
});

const imgUploadTime = computed(() => {
  return dayjs(currentImage.value?.uploadTime).format("YYYY-MM-DD HH:mm:ss");
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
 * 加载当前角度数据，根据当前选择ocr类型
 */
const handleLoadOcr = () => {
  setCurrentImageOcr();
};
// 设置当前图片对应的orc识别结果
// 如果有保存结果，取保存结果
// To Do 如果没有baiduOcr与xunfeiOcr的话，需要调用结果获取
const setCurrentImageOcr = (isOcrType = true) => {
  if (currentImage.value?.result && !isOcrType) {
    currentResult.value = currentImage.value.result.map((item) => {
      return {
        location: item.location,
        confidence: item.confidence,
        text: item.boxID || item.text,
        ocrText: item.ocrText,
      };
    });
    // 设置保存的类型
    ocrType.value = currentImage.value.result[0].vendor;
  } else if (ocrType.value === "BAI_DU") {
    currentResult.value = filterOcrData(currentImage.value.baiduOcr || []);
  } else if (ocrType.value === "XUN_FEI") {
    currentResult.value = filterOcrData(currentImage.value.xunfeiOcr || []);
  } else if (ocrType.value === "GU_GE") {
    currentResult.value = filterOcrData(currentImage.value.googleOcr || []);
  }
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

// 设置body-content大小
const setBodyContentSize = () => {
  const bodyContent = document.querySelector(".body-content");
  bodyContent.style.width = bodySize.value.width + "px";
  bodyContent.style.height = bodySize.value.height + "px";
};

// 获取滚动框的大小
const getBodySize = () => {
  const body = document.querySelector("#body");
  const { width, height } = body.getBoundingClientRect();
  bodySize.value = {
    width,
    height,
  };
};

// 根据图片原始宽高获取当前图片宽高
const getCurrentSize = (img) => {
  const naturalWidth = img.naturalWidth;
  const naturalHeight = img.naturalHeight;
  // 判断是横图，还是竖图;
  if (naturalWidth > naturalHeight) {
    // 横图
    const widthScale = naturalWidth / bodySize.value.width;
    const heightNumber = naturalHeight / widthScale; // 获取高度
    return {
      width: bodySize.value.width,
      height: heightNumber,
      diff: (bodySize.value.height - heightNumber) / 2, //获取高度差
      type: "width",
    };
  } else {
    const heightScale = naturalHeight / bodySize.value.height; // 获取高度
    const widthNumber = naturalWidth / heightScale; // 获取宽度
    return {
      width: widthNumber,
      height: bodySize.value.height,
      diff: (bodySize.value.width - widthNumber) / 2, //获取宽度差
      type: "height",
    };
  }
};

// 图片加载后设置canvas大小
const onImageLoad = (e) => {
  const img = e.target;
  const { width, height, diff, type } = getCurrentSize(img);
  canvas.value.width = width;
  canvas.value.height = height;
  canvas.value.style.width = `${width}px`;
  canvas.value.style.height = `${height}px`;
  if (type === "width") {
    canvas.value.style.top = `${diff}px`;
    canvas.value.style.left = "0px";
  } else {
    canvas.value.style.top = "0px";
    canvas.value.style.left = `${diff}px`;
  }
  // img宽高除以原始宽高
  ratio.value = width / img.naturalWidth;
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
  handleSetSize();
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
  getImageListApi(params)
    .then((res) => {
      const currentItem = res.list[0];
      imageList.value[currentPage.value - 1] = currentItem;
      totalPage.value = res?.total;
      if (imageList.value.length) {
        setCurrentImage();
      }
    })
    .catch((err) => {
      console.log(err);
      loading.value = false;
      message.error(err.msg);
    });
};

/**
 * 重置 缩放与旋转
 */
const handleResetTransform = () => {
  scale.value = 1;
  rotateValue.value = 0;
  handleSetSize();
};

/**
 * 上一页
 */
const handlePrev = () => {
  if (currentPage.value > 1) {
    currentPage.value--;
    handleResetTransform();
    setCurrentImage();
  }
};
/**
 * 下一页
 */
const handleNext = () => {
  if (currentPage.value < totalPage.value) {
    currentPage.value++;
    handleResetTransform();
    if (imageList.value[currentPage.value - 1]) {
      setCurrentImage();
    } else {
      getImageList();
    }
  }
};
// 首页
const handleToFirst = () => {
  currentPage.value = 1;
  handleResetTransform();
  if (imageList.value[currentPage.value - 1]) {
    setCurrentImage();
  } else {
    getImageList();
  }
};
// 尾页
const handleToLast = () => {
  currentPage.value = totalPage.value;
  handleResetTransform();
  if (imageList.value[currentPage.value - 1]) {
    setCurrentImage();
  } else {
    getImageList();
  }
};

const handleToNumber = () => {
  if (jumpPageNumber.value >= 1 && jumpPageNumber.value <= totalPage.value) {
    currentPage.value = jumpPageNumber.value;
    handleResetTransform();
    if (imageList.value[currentPage.value - 1]) {
      setCurrentImage();
    } else {
      getImageList();
    }
  } else {
    message.error("请输入正确的页码");
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
    if (it.isEdit) {
      // 清除上一个框选中
      setEditItemDraw(it, "green");
    }
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

// 设置auto-box大小
const handleSetSize = () => {
  const autoBox = document.querySelector(".auto-box");
  if (scale.value === 1 && rotateValue.value % 180 === 0) {
    autoBox.style.width = bodySize.value.width + "px";
    autoBox.style.height = bodySize.value.height + "px";
  } else {
    autoBox.style.width = bodySize.value.width * scale.value + "px";
    autoBox.style.height = bodySize.value.height * scale.value + "px";
  }
};
// 缩小
const handleToScaleSmall = () => {
  if (scale.value > 1) {
    scale.value -= 0.1;
  }
  handleSetSize();
};
// 放大
const handleToScaleBig = () => {
  if (scale.value < 10) {
    scale.value += 0.1;
  }
  handleSetSize();
};

// 确定删除
const handleDelete = (deleteIndex) => {
  const sourceId = currentImage.value?.sourceId;
  const imageUrl = currentImage.value?.imageUrl;
  const results = currentResult.value.filter((_, index) => {
    return index !== deleteIndex;
  });
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
    message.success("删除成功");
    currentResult.value = results;
    resultList.value[currentPage.value] = results;
    currentImage.value.result = results;
    imageList.value[currentPage.value - 1].result = results;
    filterData(currentResult.value);
    console.log(resultList.value, imageList.value);
  });
};

// 取消删除
const handleCancel = (index) => {};

// 从地址栏中获取sessionKey
const getSessionKey = () => {
  const urlParams = new URLSearchParams(window.location.search);
  const session = urlParams.get("session");
  if (session) {
    getAuthApi({ session }).then((res) => {
      console.log(res, "--");
      if (res) {
        sessionKey.value = session;
        nextTick(() => {
          getBodySize();
          setBodyContentSize();
          getImageList();
        });
      }
    });
  }
};

getSessionKey();

// onMounted(() => {
//   getBodySize();
//   setBodyContentSize();
//   getImageList();
// });
</script>

<template>
  <a-config-provider :locale="zhCN">
    <div class="page-box" v-if="sessionKey">
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
            <!-- <a-radio-button value="XUN_FEI">讯飞</a-radio-button>
          <a-radio-button value="GU_GE">谷歌</a-radio-button> -->
          </a-radio-group>
        </div>

        <div class="control-item">图片上传时间：{{ imgUploadTime }}</div>
      </div>
      <div class="container-box">
        <div class="container">
          <div class="body" id="body">
            <div class="auto-box">
              <div class="body-content" :style="{ transform: transform }">
                <img
                  class="body-content-img"
                  v-show="currentImage?.imageUrl"
                  :src="currentImage?.imageUrl"
                  @load="onImageLoad"
                  @error="onImageError"
                  alt=""
                />
                <canvas ref="canvas" class="body-content-canvas"></canvas>
              </div>
            </div>
          </div>
        </div>

        <div class="result-list">
          <div
            class="result-item"
            v-for="(item, index) in showCurrentResult"
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
            <a-popconfirm
              title="确定删除吗?"
              ok-text="确定"
              cancel-text="取消"
              @confirm="handleDelete(index)"
              @cancel="handleCancel"
            >
              <a-button class="control-btn" danger> 删除 </a-button>
            </a-popconfirm>
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
          <a-button class="control-btn" @click="handleToFirst">首页</a-button>
          <a-button class="control-btn" @click="handlePrev">上一页</a-button>
          <div class="pagination-value">
            {{ currentPage }}/{{ totalPage || 1 }}
          </div>
          <a-button class="control-btn" @click="handleNext">下一页</a-button>
          <a-button class="control-btn" @click="handleToLast">尾页</a-button>
          <a-input
            placeholder="输入页码"
            v-model:value="jumpPageNumber"
            style="width: 100px"
          ></a-input>
          <a-button class="control-btn" @click="handleToNumber">跳转</a-button>
        </div>

        <div class="control-item">
          <a-button class="control-btn" @click="handleExport"
            >导出数据</a-button
          >
        </div>

        <div class="control-item">
          <a-button class="control-btn" @click="handleToScaleSmall"
            >缩小</a-button
          >
          <a-button class="control-btn" @click="handleToScaleBig"
            >放大</a-button
          >
        </div>
      </div>
    </div>
    <div class="no-permission" v-else>
      <ExclamationCircleOutlined style="font-size: 48px; color: #ff4d4f" />
      <div class="no-permission-title">您没有权限访问该页面</div>
    </div>
  </a-config-provider>
</template>

<style lang="less" scoped>
:deep(.ant-input) {
  color: #333;
}
.page-box {
  width: 100vw;
  height: 100vh;
}
.no-permission {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  background-color: #f0f2f5;
  font-size: 24px;
  color: #ff4d4f;
  flex-direction: column;
}

.no-permission-title {
  margin-top: 20px;
  font-weight: bold;
}

.container-box {
  width: 100vw;
  height: calc(100vh - 120px);
  // min-width: 1920px;
  // min-height: 1080px;
  padding: 0rem 2rem;
  box-sizing: border-box;
  display: flex;
  justify-content: center;
  // min-width: calc(1000px + 12rem);

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
    box-sizing: border-box;
    width: 346px;
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
  width: calc(100% - 346px);
  height: calc(100%);

  .control-btn {
    margin-left: 6px;
  }

  .body {
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.1);
    overflow: auto;
    position: relative;

    .auto-box {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .body-content {
      width: 0px;
      height: 0px;
      position: relative;
      transform-origin: center center;

      .body-content-img {
        display: block;
        width: 100%;
        height: 100%;
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
}
.control-list {
  padding: 1rem 2rem;
  box-sizing: border-box;
  width: 100%;
  display: flex;
  align-items: center;

  .control-item {
    display: flex;
    align-items: center;
    margin-right: 1rem;
    gap: 0.5rem;
  }

  .ratio-value {
    color: black;
  }

  .pagination-value {
    display: flex;
    margin-left: 6px;
  }
}
</style>
