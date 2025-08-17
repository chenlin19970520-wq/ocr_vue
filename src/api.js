import { message } from "ant-design-vue";

export const proxyUrl = "/";
export const Fetch = (url, params, options = {}) => {
  const newOptions = {
    method: "POST",
    headers: {},
    ...options,
  };
  let requestUrl = url;
  if (newOptions.method === "GET") {
    const queryString = Object.keys(params)
      .map(
        (key) => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`
      )
      .join("&");
    if (queryString) {
      requestUrl += `?${queryString}`;
    }
  } else if (newOptions.method === "POST") {
    newOptions.headers["Content-Type"] = "application/json";
    newOptions.body = JSON.stringify(params);
  }
  return new Promise((resolve, reject) => {
    return window
      .fetch(requestUrl, newOptions)
      .then((res) => res.json())
      .then((data) => {
        if (data.code === 0 || data.data.success === true) {
          resolve(data.data);
        } else {
          reject(data);
        }
      })
      .catch((err) => {
        reject(err);
      });
  });
};

/**
 * 导出文件
 * @param {*} url
 * @param {*} params
 * @param {*} option
 */
export const Download = (url, params, option = {}) => {
  const newOptions = {
    method: "POST",
    headers: {},
    ...option,
  };
  let requestUrl = url;
  if (newOptions.method === "GET") {
    const queryString = Object.keys(params)
      .map(
        (key) => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`
      )
      .join("&");
    if (queryString) {
      requestUrl += `?${queryString}`;
    }
  } else if (newOptions.method === "POST") {
    newOptions.headers["Content-Type"] = "application/json";
    newOptions.body = JSON.stringify(params);
  }
  return window
    .fetch(requestUrl, newOptions)
    .then((res) => {
      return res.blob();
    })
    .then((blob) => {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `${params.statisDay}导出数据.xlsx`;
      a.click();
      URL.revokeObjectURL(a.href);
      message.success("导出成功！");
      return blob;
    })
    .catch((err) => {
      message.error("导出失败！");
      return err;
    });
};

/**
 * 获取 图片的识别结果
 */
export const OcrBaiduApi = (params) => {
  const newParams = {
    vendor: "BAIDU",
    languageType: "CHN_ENG",
    detectDirection: false,
    vertexesLocation: true,
    ...params,
  };
  return Fetch(`${proxyUrl}api/ocr/recognize`, newParams);
};
/**
 * 获取图片列表
 */
export const getImageListApi = (params) => {
  return Fetch(`${proxyUrl}api/images/bydate`, params, { method: "GET" });
};
/**
 * 保持图片识别结果
 */
export const saveImageOrcApi = (params) => {
  return Fetch(`${proxyUrl}api/images/result/save`, params);
};
/**
 * 导出接口
 */
export const exportApi = (params) => {
  return Download(`${proxyUrl}api/images/export`, params);
};
