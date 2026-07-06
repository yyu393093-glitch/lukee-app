"use client";

import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import {
  ArrowLeft,
  BookmarkPlus,
  Camera,
  ChevronRight,
  Clock3,
  Heart,
  Link2,
  LocateFixed,
  MapIcon,
  MapPinned,
  PlayCircle,
  Search,
  Settings,
  SlidersHorizontal,
  Sparkles,
  Star,
  ToggleRight,
  User,
  UserRound,
  Utensils,
  WandSparkles,
} from "lucide-react";
import { placeLexicon } from "./placeLexicon";

type Screen = "map" | "route" | "copy" | "routeCard" | "food" | "photo" | "me";
type TravelMode = "transfer" | "walking" | "driving";

type Place = {
  name: string;
  lat: number;
  lon: number;
  address?: string;
  photoUrl?: string;
};

type RouteSegment = {
  from: Place;
  to: Place;
  mode: TravelMode;
  distanceText: string;
  durationText: string;
  summary: string;
  steps: string[];
  navUrl: string;
};

type ModePlan = {
  mode: TravelMode;
  segments: RouteSegment[];
  distanceText: string;
  durationText: string;
};

type TripPlan = {
  sourceText: string;
  mode: TravelMode;
  places: Place[];
  segments: RouteSegment[];
  options: Partial<Record<TravelMode, ModePlan>>;
  createdAt: string;
};

declare global {
  interface Window {
    AMapLoader?: {
      load: (config: Record<string, unknown>) => Promise<any>;
    };
    _AMapSecurityConfig?: {
      securityJsCode?: string;
    };
  }
}

const AMAP_KEY = import.meta.env.VITE_AMAP_KEY || "08f83cf8d6927b669e1d7ac6e7233c23";
const AMAP_SECURITY_CODE = import.meta.env.VITE_AMAP_SECURITY_CODE || "";

const initialPlace: Place = {
  name: "北京中轴线",
  lat: 39.9163,
  lon: 116.3972,
  address: "北京市东城区",
};

const demoText = "北京一日游：上午去景山公园万春亭拍故宫，中午四季民福烤鸭店，下午去故宫博物院，傍晚什刹海看日落拍照。";

const fallbackStops = [
  ["09:30", "景山公园", "先登高看故宫屋脊，光线更稳。"],
  ["11:20", "故宫博物院", "沿中轴线慢走，保留拍照时间。"],
  ["13:00", "四季民福烤鸭店", "烤鸭午餐，建议提前排队取号。"],
  ["16:40", "什刹海", "湖边日落和行走动作参考。"],
];

const foodItems = [
  {
    name: "四季民福烤鸭店",
    note: "路线偏离约 8 分钟，人均约 150，适合正餐。",
    img: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=420&q=80",
  },
  {
    name: "姚记炒肝",
    note: "老北京小吃，适合把午餐做轻一点。",
    img: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=420&q=80",
  },
  {
    name: "护国寺小吃",
    note: "靠近什刹海，适合路线末段补给。",
    img: "https://images.unsplash.com/photo-1482049016688-2d3e1b311543?auto=format&fit=crop&w=420&q=80",
  },
];

const placeImagePool = [
  "https://images.unsplash.com/photo-1508804185872-d7badad00f7d?auto=format&fit=crop&w=420&q=80",
  "https://images.unsplash.com/photo-1528181304800-259b08848526?auto=format&fit=crop&w=420&q=80",
  "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=420&q=80",
  "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=420&q=80",
  "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=420&q=80",
];

const fallbackScenicPhoto = placeImagePool[0];

const foodPhotoByType: Record<string, string> = {
  正餐: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=420&q=80",
  轻食小吃: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=420&q=80",
  "咖啡/甜品": "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=420&q=80",
  顺路补给: "https://images.unsplash.com/photo-1482049016688-2d3e1b311543?auto=format&fit=crop&w=420&q=80",
};

const fallbackFoodPhoto = foodPhotoByType["顺路补给"];
const PLACE_IMAGE_CACHE_KEY = "lukee.placeImageCache.v3";

const posePhotoPool = [
  "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=420&q=80",
  "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=420&q=80",
  "https://images.unsplash.com/photo-1491553895911-0055eca6402d?auto=format&fit=crop&w=420&q=80",
  "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=420&q=80",
];

const placePhotoMap: Record<string, string> = {
  天安门广场: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a9/Tiananmen_Gate.JPG/420px-Tiananmen_Gate.JPG",
  故宫博物院: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/84/Forbidden_City_Beijing_Shenwumen_Gate.JPG/420px-Forbidden_City_Beijing_Shenwumen_Gate.JPG",
  景山公园: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/ef/The_Forbidden_City_-_View_from_Coal_Hill.jpg/420px-The_Forbidden_City_-_View_from_Coal_Hill.jpg",
  什刹海: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/63/Shichahai_Houhai_Beijing.jpg/420px-Shichahai_Houhai_Beijing.jpg",
  南锣鼓巷: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a4/Nanluoguxiang_Beijing_2012.JPG/420px-Nanluoguxiang_Beijing_2012.JPG",
  颐和园: "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d8/Summer_Palace_Beijing_2008.JPG/420px-Summer_Palace_Beijing_2008.JPG",
  外滩: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/81/The_Bund_Shanghai.jpg/420px-The_Bund_Shanghai.jpg",
  东方明珠广播电视塔: "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f4/Oriental_Pearl_Tower_in_Shanghai.jpg/420px-Oriental_Pearl_Tower_in_Shanghai.jpg",
  西湖风景名胜区: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/55/West_Lake%2C_Hangzhou.jpg/420px-West_Lake%2C_Hangzhou.jpg",
  夫子庙秦淮风光带: "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d0/Nanjing_Fuzimiao_Qinhuai_River.jpg/420px-Nanjing_Fuzimiao_Qinhuai_River.jpg",
  苏州园林: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9c/Humble_Administrator%27s_Garden%2C_Suzhou%2C_China.jpg/420px-Humble_Administrator%27s_Garden%2C_Suzhou%2C_China.jpg",
  鼋头渚: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e8/Yuantouzhu_Cherry_Blossom.jpg/420px-Yuantouzhu_Cherry_Blossom.jpg",
  青岛栈桥: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c4/Zhanqiao_Pier_Qingdao.jpg/420px-Zhanqiao_Pier_Qingdao.jpg",
  泰山风景名胜区: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0b/Mount_Tai.JPG/420px-Mount_Tai.JPG",
  大雁塔: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0f/Giant_Wild_Goose_Pagoda_Xi%27an.jpg/420px-Giant_Wild_Goose_Pagoda_Xi%27an.jpg",
  秦始皇帝陵博物院: "https://upload.wikimedia.org/wikipedia/commons/thumb/7/70/Terracotta_Army%2C_View_of_Pit_1.jpg/420px-Terracotta_Army%2C_View_of_Pit_1.jpg",
  成都大熊猫繁育研究基地: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0f/Grosser_Panda.JPG/420px-Grosser_Panda.JPG",
  九寨沟风景名胜区: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5c/Jiuzhaigou_Valley_Scenery.jpg/420px-Jiuzhaigou_Valley_Scenery.jpg",
  乐山大佛: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4f/Leshan_Giant_Buddha_2006.jpg/420px-Leshan_Giant_Buddha_2006.jpg",
  洪崖洞民俗风貌区: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8e/Hongyadong_Chongqing.jpg/420px-Hongyadong_Chongqing.jpg",
  张家界国家森林公园: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2a/Zhangjiajie_National_Forest_Park.jpg/420px-Zhangjiajie_National_Forest_Park.jpg",
  黄鹤楼: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0d/Yellow_Crane_Tower_2012.jpg/420px-Yellow_Crane_Tower_2012.jpg",
  黄山风景区: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Huangshan_pic_4.jpg/420px-Huangshan_pic_4.jpg",
  鼓浪屿: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/23/Gulangyu_Island_Xiamen.jpg/420px-Gulangyu_Island_Xiamen.jpg",
  广州塔: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5d/Canton_Tower_2013.jpg/420px-Canton_Tower_2013.jpg",
  桂林漓江风景名胜区: "https://upload.wikimedia.org/wikipedia/commons/thumb/d/de/Li_River_Guilin.jpg/420px-Li_River_Guilin.jpg",
  洱海: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/44/Erhai_Lake_Dali.jpg/420px-Erhai_Lake_Dali.jpg",
  丽江古城: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0c/Lijiang_old_town.jpg/420px-Lijiang_old_town.jpg",
  玉龙雪山: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4b/Jade_Dragon_Snow_Mountain.jpg/420px-Jade_Dragon_Snow_Mountain.jpg",
  黄果树瀑布: "https://upload.wikimedia.org/wikipedia/commons/thumb/7/79/Huangguoshu_Waterfall.jpg/420px-Huangguoshu_Waterfall.jpg",
  平遥古城: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3f/Pingyao_City_Wall.jpg/420px-Pingyao_City_Wall.jpg",
  龙门石窟: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/99/Longmen_Grottoes_lushena.jpg/420px-Longmen_Grottoes_lushena.jpg",
  布达拉宫: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/95/Potala_Palace_Lhasa_Tibet.jpg/420px-Potala_Palace_Lhasa_Tibet.jpg",
  青海湖: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6a/Qinghai_Lake.jpg/420px-Qinghai_Lake.jpg",
  莫高窟: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/57/Mogao_Caves_Dunhuang.jpg/420px-Mogao_Caves_Dunhuang.jpg",
  喀纳斯景区: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a8/Kanas_Lake.jpg/420px-Kanas_Lake.jpg",
};

const manualKnownPlaces: Record<string, Place> = {
  天安门: { name: "天安门广场", lat: 39.9087, lon: 116.3975, address: "北京市东城区东长安街" },
  天安门广场: { name: "天安门广场", lat: 39.9087, lon: 116.3975, address: "北京市东城区东长安街" },
  故宫: { name: "故宫博物院", lat: 39.9163, lon: 116.3972, address: "北京市东城区景山前街4号" },
  故宫博物院: { name: "故宫博物院", lat: 39.9163, lon: 116.3972, address: "北京市东城区景山前街4号" },
  景山: { name: "景山公园", lat: 39.9251, lon: 116.3965, address: "北京市西城区景山西街44号" },
  景山公园: { name: "景山公园", lat: 39.9251, lon: 116.3965, address: "北京市西城区景山西街44号" },
  万春亭: { name: "景山万春亭", lat: 39.9256, lon: 116.3967, address: "景山公园内" },
  南锣鼓巷: { name: "南锣鼓巷", lat: 39.9370, lon: 116.4039, address: "北京市东城区南锣鼓巷" },
  什刹海: { name: "什刹海", lat: 39.9402, lon: 116.3848, address: "北京市西城区什刹海" },
  后海: { name: "后海", lat: 39.9423, lon: 116.3831, address: "北京市西城区后海" },
  北海公园: { name: "北海公园", lat: 39.9255, lon: 116.3895, address: "北京市西城区文津街1号" },
  鼓楼: { name: "北京鼓楼", lat: 39.9409, lon: 116.3956, address: "北京市东城区钟楼湾胡同" },
  钟鼓楼: { name: "北京钟鼓楼", lat: 39.9409, lon: 116.3956, address: "北京市东城区钟楼湾胡同" },
  前门: { name: "前门大街", lat: 39.8965, lon: 116.3978, address: "北京市东城区前门大街" },
  大栅栏: { name: "大栅栏商业街", lat: 39.8948, lon: 116.3919, address: "北京市西城区大栅栏街" },
  前门大街: { name: "前门大街", lat: 39.8965, lon: 116.3978, address: "北京市东城区前门大街" },
  四季民福: { name: "四季民福烤鸭店", lat: 39.9146, lon: 116.4042, address: "北京市东城区" },
  国博: { name: "中国国家博物馆", lat: 39.9051, lon: 116.4013, address: "北京市东城区东长安街16号" },
  中国国家博物馆: { name: "中国国家博物馆", lat: 39.9051, lon: 116.4013, address: "北京市东城区东长安街16号" },
  王府井: { name: "王府井步行街", lat: 39.9149, lon: 116.4110, address: "北京市东城区王府井" },
  雍和宫: { name: "雍和宫", lat: 39.9470, lon: 116.4173, address: "北京市东城区雍和宫大街" },
  颐和园: { name: "颐和园", lat: 39.9999, lon: 116.2755, address: "北京市海淀区新建宫门路19号" },
  圆明园: { name: "圆明园遗址公园", lat: 40.0089, lon: 116.2983, address: "北京市海淀区清华西路28号" },
  鸟巢: { name: "国家体育场鸟巢", lat: 39.9929, lon: 116.3975, address: "北京市朝阳区国家体育场南路1号" },
  水立方: { name: "国家游泳中心水立方", lat: 39.9910, lon: 116.3849, address: "北京市朝阳区天辰东路11号" },
  三里屯: { name: "三里屯太古里", lat: 39.9335, lon: 116.4543, address: "北京市朝阳区三里屯路" },
  太古里: { name: "三里屯太古里", lat: 39.9335, lon: 116.4543, address: "北京市朝阳区三里屯路" },
  三里屯太古里: { name: "三里屯太古里", lat: 39.9335, lon: 116.4543, address: "北京市朝阳区三里屯路" },
  三里屯西五街: { name: "三里屯西五街", lat: 39.9354, lon: 116.4509, address: "北京市朝阳区三里屯西五街" },
  亮马河: { name: "亮马河", lat: 39.9486, lon: 116.4715, address: "北京市朝阳区亮马河" },
  蓝色港湾: { name: "蓝色港湾", lat: 39.9406, lon: 116.4745, address: "北京市朝阳区朝阳公园路6号" },
  朝阳公园: { name: "朝阳公园", lat: 39.9337, lon: 116.4883, address: "北京市朝阳区朝阳公园南路1号" },
  北京站: { name: "北京站", lat: 39.9022, lon: 116.4270, address: "北京市东城区毛家湾胡同甲13号" },
  北京南站: { name: "北京南站", lat: 39.8652, lon: 116.3786, address: "北京市丰台区永外大街" },
};

function attachKnownPhoto(place: Place): Place {
  return {
    ...place,
    photoUrl: place.photoUrl || placePhotoMap[place.name],
  };
}

const lexiconKnownPlaces = placeLexicon.reduce<Record<string, Place>>((acc, entry) => {
  const place = attachKnownPhoto({
    name: entry.name,
    lat: entry.lat,
    lon: entry.lon,
    address: entry.address || `${entry.province}${entry.city}`,
  });

  [entry.name, ...entry.aliases].forEach((alias) => {
    acc[alias] = place;
  });

  return acc;
}, {});

const knownPlaces: Record<string, Place> = {
  ...lexiconKnownPlaces,
  ...Object.fromEntries(Object.entries(manualKnownPlaces).map(([alias, place]) => [alias, attachKnownPhoto(place)])),
};

const lexiconAliasCount = placeLexicon.reduce((sum, entry) => sum + entry.aliases.length + 1, 0);
const LEARNED_PLACES_KEY = "lukee.learnedPlaces";

function loadLearnedPlaceMap(): Record<string, Place> {
  if (typeof window === "undefined") return {};

  try {
    const value = window.localStorage.getItem(LEARNED_PLACES_KEY);
    if (!value) return {};
    return JSON.parse(value) as Record<string, Place>;
  } catch {
    return {};
  }
}

function getPlaceDictionary() {
  return {
    ...knownPlaces,
    ...loadLearnedPlaceMap(),
  };
}

function learnedPlaceCount() {
  return Object.keys(loadLearnedPlaceMap()).length;
}

function saveLearnedPlace(alias: string, place: Place) {
  if (typeof window === "undefined") return 0;
  const cleanAlias = alias.trim();
  if (!cleanAlias) return learnedPlaceCount();

  const next = loadLearnedPlaceMap();
  const nextPlace = {
    ...place,
    photoUrl: place.photoUrl || placePhotoUrl(place, 0),
  };
  next[cleanAlias] = nextPlace;
  next[nextPlace.name] = nextPlace;
  window.localStorage.setItem(LEARNED_PLACES_KEY, JSON.stringify(next));
  return Object.keys(next).length;
}

const douyinSpotUrl = "https://www.douyin.com/search/%E6%99%AF%E5%B1%B1%20%E4%B8%87%E6%98%A5%E4%BA%AD%20%E6%95%85%E5%AE%AB%20%E6%8B%8D%E7%85%A7%20%E6%9C%BA%E4%BD%8D";
const douyinPoseUrl = "https://www.douyin.com/search/%E4%BB%80%E5%88%B9%E6%B5%B7%20%E6%97%A5%E8%90%BD%20%E6%8B%8D%E7%85%A7%20%E5%A7%BF%E5%8A%BF";
const xhsSpotUrl = "https://www.xiaohongshu.com/search_result?keyword=%E6%99%AF%E5%B1%B1%20%E4%B8%87%E6%98%A5%E4%BA%AD%20%E6%95%85%E5%AE%AB%20%E6%8B%8D%E7%85%A7%20%E6%9C%BA%E4%BD%8D";
const xhsPoseUrl = "https://www.xiaohongshu.com/search_result?keyword=%E4%BB%80%E5%88%B9%E6%B5%B7%20%E6%97%A5%E8%90%BD%20%E6%8B%8D%E7%85%A7%20%E5%A7%BF%E5%8A%BF";

let amapLoaderPromise: Promise<any> | null = null;

function loadAmap() {
  if (AMAP_SECURITY_CODE) {
    window._AMapSecurityConfig = {
      securityJsCode: AMAP_SECURITY_CODE,
    };
  }

  if (!amapLoaderPromise) {
    amapLoaderPromise = new Promise((resolve, reject) => {
      const loadApi = () => {
        window.AMapLoader?.load({
          key: AMAP_KEY,
          version: "2.0",
          plugins: [
            "AMap.PlaceSearch",
            "AMap.Geolocation",
            "AMap.ToolBar",
            "AMap.Scale",
            "AMap.Transfer",
            "AMap.Walking",
            "AMap.Driving",
            "AMap.CitySearch",
          ],
        })
          .then(resolve)
          .catch(reject);
      };

      if (window.AMapLoader) {
        loadApi();
        return;
      }

      const script = document.createElement("script");
      script.src = "https://webapi.amap.com/loader.js";
      script.async = true;
      script.onload = loadApi;
      script.onerror = () => reject(new Error("高德地图 Loader 加载失败"));
      document.head.appendChild(script);
    });
  }

  return amapLoaderPromise;
}

function distanceText(meters?: number) {
  if (!meters || Number.isNaN(meters)) return "距离待确认";
  if (meters >= 1000) return `${(meters / 1000).toFixed(1)} km`;
  return `${Math.round(meters)} m`;
}

function durationText(seconds?: number) {
  if (!seconds || Number.isNaN(seconds)) return "时间待确认";
  const minutes = Math.max(1, Math.round(seconds / 60));
  if (minutes >= 60) return `${Math.floor(minutes / 60)}小时${minutes % 60}分钟`;
  return `${minutes}分钟`;
}

function parseDistanceToMeters(text: string) {
  const value = Number.parseFloat(text);
  if (!Number.isFinite(value)) return 0;
  if (text.includes("km")) return value * 1000;
  if (text.includes("m")) return value;
  return 0;
}

function parseDurationToMinutes(text: string) {
  const hourMatch = text.match(/(\d+)小时/);
  const minuteMatch = text.match(/(\d+)分钟/);
  return (hourMatch ? Number(hourMatch[1]) * 60 : 0) + (minuteMatch ? Number(minuteMatch[1]) : 0);
}

function summarizeModePlan(mode: TravelMode, segments: RouteSegment[]): ModePlan {
  const totalMeters = segments.reduce((sum, item) => sum + parseDistanceToMeters(item.distanceText), 0);
  const totalMinutes = segments.reduce((sum, item) => sum + parseDurationToMinutes(item.durationText), 0);

  return {
    mode,
    segments,
    distanceText: distanceText(totalMeters),
    durationText: totalMinutes ? durationText(totalMinutes * 60) : "时间待确认",
  };
}

function modeLabel(mode: TravelMode) {
  if (mode === "walking") return "步行";
  if (mode === "driving") return "驾车";
  return "公交/地铁";
}

function preferenceLabel(mode: TravelMode) {
  if (mode === "walking") return "步行多";
  if (mode === "driving") return "打车/自驾多";
  return "公交地铁多";
}

function amapMode(mode: TravelMode) {
  if (mode === "walking") return "walk";
  if (mode === "driving") return "car";
  return "bus";
}

function amapNavigationUrl(from: Place, to: Place, mode: TravelMode) {
  const params = new URLSearchParams({
    from: `${from.lon},${from.lat},${from.name}`,
    to: `${to.lon},${to.lat},${to.name}`,
    mode: amapMode(mode),
    policy: "1",
    src: "lukee",
    coordinate: "gaode",
    callnative: "0",
  });

  return `https://uri.amap.com/navigation?${params.toString()}`;
}

function minutesToClock(totalMinutes: number) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function scheduleWindow(index: number) {
  const start = 450 + index * 150;
  const end = start + (index === 1 ? 210 : 75);
  return `${minutesToClock(start)} - ${minutesToClock(end)}`;
}

function placeCategory(name: string) {
  if (/饭|餐|烤鸭|小吃|咖啡|酒|茶/.test(name)) return "美食";
  if (/酒店|民宿/.test(name)) return "住宿";
  return "景点";
}

function placePhotoUrl(place: Place, index: number) {
  if (place.photoUrl) return place.photoUrl;
  if (placePhotoMap[place.name]) return placePhotoMap[place.name];

  const lexiconEntry = placeLexicon.find((entry) => {
    const names = [entry.name, ...entry.aliases];
    return names.some((name) => place.name.includes(name) || name.includes(place.name));
  });

  if (lexiconEntry && placePhotoMap[lexiconEntry.name]) return placePhotoMap[lexiconEntry.name];
  return placePlaceholderImage(place.name);
}

function placePlaceholderImage(name: string) {
  const label = encodeURIComponent(`${name}\n图片待匹配`);
  return `data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='420' height='320' viewBox='0 0 420 320'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' x2='1' y1='0' y2='1'%3E%3Cstop stop-color='%23dfeee7'/%3E%3Cstop offset='1' stop-color='%2388a89a'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='420' height='320' rx='34' fill='url(%23g)'/%3E%3Ctext x='210' y='145' text-anchor='middle' font-family='Microsoft YaHei,Arial' font-size='28' font-weight='800' fill='%230b2018'%3E${label}%3C/text%3E%3Ctext x='210' y='190' text-anchor='middle' font-family='Arial' font-size='16' fill='%23465c53'%3E正在等待关键词匹配图%3C/text%3E%3C/svg%3E`;
}

function loadPlaceImageCache(): Record<string, string> {
  try {
    return JSON.parse(window.localStorage.getItem(PLACE_IMAGE_CACHE_KEY) || "{}");
  } catch {
    return {};
  }
}

function savePlaceImageCache(cache: Record<string, string>) {
  window.localStorage.setItem(PLACE_IMAGE_CACHE_KEY, JSON.stringify(cache));
}

async function fetchMatchedPlaceImage(place: Place) {
  const cache = loadPlaceImageCache();
  if (cache[place.name]) return cache[place.name];

  try {
    const response = await fetch(apiUrl(`/api/place-image?keyword=${encodeURIComponent(place.name)}`));
    if (!response.ok) return "";
    const data = await response.json();
    if (data.ok && data.imageUrl) {
      cache[place.name] = data.imageUrl;
      savePlaceImageCache(cache);
      return data.imageUrl as string;
    }
  } catch {
    return "";
  }

  return "";
}

async function enrichPlacesWithMatchedImages(places: Place[]) {
  const enriched = await Promise.all(
    places.map(async (place) => {
      if (place.photoUrl && !place.photoUrl.startsWith("data:")) return place;
      if (placePhotoMap[place.name]) return { ...place, photoUrl: placePhotoMap[place.name] };
      const imageUrl = await fetchMatchedPlaceImage(place);
      return imageUrl ? { ...place, photoUrl: imageUrl } : place;
    }),
  );

  return enriched;
}

function posePhotoUrl(place: Place, index: number) {
  if (/湖|海|河|江|洱海|西湖|什刹海|后海/.test(place.name)) return posePhotoPool[1];
  if (/街|巷|胡同|古城|古镇|市集|太古里/.test(place.name)) return posePhotoPool[2];
  if (/山|塔|楼|宫|寺|城墙|公园/.test(place.name)) return posePhotoPool[3];
  return posePhotoPool[index % posePhotoPool.length];
}

function poiNativePhotoUrl(poi: any) {
  return poi?.photos?.[0]?.url || poi?.photos?.[0]?.url_big || poi?.photos?.[0]?.url_small || "";
}

function shotVisualAssets(place: Place, index: number) {
  return [
    { label: "景点", img: placePhotoUrl(place, index), text: "先确认地点主体和环境氛围" },
    { label: "机位", img: placePhotoUrl(place, index), text: photoPlan(place, index).spot },
    { label: "动作", img: posePhotoUrl(place, index), text: photoPlan(place, index).pose },
  ];
}

function placeNote(place: Place, index: number) {
  if (/天安门|广场/.test(place.name)) return "清晨人少，适合拍照，部分区域需提前预约并带身份证。";
  if (/故宫/.test(place.name)) return "建议从午门入、神武门出，预留 3-4 小时，旺季尽量提前预约。";
  if (/景山|万春亭/.test(place.name)) return "登高俯瞰中轴线和故宫屋脊，日落前后光线更好。";
  if (/什刹海|后海/.test(place.name)) return "适合傍晚散步、湖边拍照，也能顺路找晚餐。";
  if (/饭|餐|烤鸭|小吃/.test(place.name)) return "作为路线中的补给点，建议提前排队或预约。";
  return index === 0 ? "作为第一站，建议提前确认开放时间和预约要求。" : "根据前一站交通时间顺路抵达，保留拍照和休息时间。";
}

function photoPlan(place: Place, index: number) {
  if (/故宫|天安门/.test(place.name)) {
    return {
      spot: /天安门/.test(place.name) ? "广场中轴线偏侧位置，避开人流正中" : "午门外广场、神武门外红墙侧线",
      light: "清晨 7:00-8:30 或傍晚 16:30 后",
      pose: "侧身慢走、回头看镜头、手拿门票或相机",
      frame: "用城楼/红墙做背景，人物站画面下三分之一",
    };
  }

  if (/景山|万春亭/.test(place.name)) {
    return {
      spot: "万春亭栏杆侧后方，长焦压故宫屋脊",
      light: "日落前 40 分钟到蓝调时刻",
      pose: "扶栏远眺、背影看中轴线、侧脸望向屋脊",
      frame: "人小景大，保留完整屋脊和天空层次",
    };
  }

  if (/什刹海|后海|湖|海/.test(place.name)) {
    return {
      spot: "湖边栏杆、桥头、临水步道转角",
      light: "傍晚 17:00 后，日落和灯光都更稳",
      pose: "沿湖慢走、回头、坐在栏杆旁看水面",
      frame: "把水面反光放进下半部分，人物靠边更自然",
    };
  }

  if (/南锣鼓巷|胡同|街|巷/.test(place.name)) {
    return {
      spot: "街巷纵深处、店铺门头、胡同转角",
      light: "下午侧光，避开正午硬光",
      pose: "拿饮品走路、看橱窗、低头整理包带",
      frame: "利用街巷线条做纵深，人物站在三分线",
    };
  }

  if (/塔|楼|山|寺|宫/.test(place.name)) {
    return {
      spot: "主体建筑对角线位置，找前景树影或台阶",
      light: index <= 1 ? "上午柔光，先拍空景再拍人像" : "下午侧逆光，轮廓更干净",
      pose: "仰头看建筑、台阶行走、手扶栏杆",
      frame: "建筑完整入画，人物不要贴边",
    };
  }

  return {
    spot: "入口标识、转角、开阔处先拍环境，再找局部",
    light: index <= 1 ? "上午柔光" : "下午到傍晚更适合人像",
    pose: "自然行走、回头、拿手机看路线",
    frame: "保留地点识别物，让照片能看出你在哪里",
  };
}

function normalizePoiLocation(location: any) {
  const lon = typeof location?.getLng === "function" ? location.getLng() : location?.lng;
  const lat = typeof location?.getLat === "function" ? location.getLat() : location?.lat;
  return { lon: Number(lon), lat: Number(lat) };
}

function hasOnlyUrls(text: string) {
  const withoutUrls = text.replace(/https?:\/\/\S+/g, "").replace(/\s/g, "");
  return text.includes("http") && withoutUrls.length < 4;
}

function safeDecode(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function extractUrls(input: string) {
  return (input.match(/https?:\/\/\S+/g) || []).map((url) => url.replace(/[),，。；;]+$/g, ""));
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error || new Error("读取图片失败"));
    reader.readAsDataURL(file);
  });
}

function apiUrl(path: string) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  if (typeof window === "undefined") return normalizedPath;
  if (window.location.port === "5173") return `http://127.0.0.1:5174${normalizedPath}`;
  return normalizedPath;
}

function normalizeOcrText(text: string) {
  return text
    .replace(/([\u4e00-\u9fa5])\s+(?=[\u4e00-\u9fa5])/g, "$1")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function extractUrlText(input: string) {
  const urls = extractUrls(input);
  const fragments: string[] = [];

  for (const rawUrl of urls) {
    const cleanUrl = rawUrl.replace(/[),，。；;]+$/g, "");
    fragments.push(safeDecode(cleanUrl));

    try {
      const url = new URL(cleanUrl);
      const usefulKeys = ["keyword", "keywords", "q", "query", "title", "desc", "description", "text", "content"];
      for (const key of usefulKeys) {
        const value = url.searchParams.get(key);
        if (value) fragments.push(safeDecode(value));
      }

      for (const value of url.searchParams.values()) {
        const decoded = safeDecode(value);
        if (/[\u4e00-\u9fa5]/.test(decoded)) fragments.push(decoded);
      }
    } catch {
      // Some shared app links are intentionally non-standard. The decoded raw URL above is still useful.
    }
  }

  return fragments.join(" ");
}

function recognitionText(input: string) {
  return `${input} ${safeDecode(input)} ${extractUrlText(input)}`;
}

async function parseLinksWithBackend(input: string) {
  const urls = extractUrls(input).slice(0, 3);
  if (!urls.length) return "";

  const parsed = await Promise.all(
    urls.map(async (url) => {
      try {
        const response = await fetch(apiUrl(`/api/parse-link?url=${encodeURIComponent(url)}`));
        if (!response.ok) return "";
        const data = await response.json();
        return [data.title, data.description, data.keywords, data.text].filter(Boolean).join("\n");
      } catch {
        return "";
      }
    }),
  );

  return parsed.filter(Boolean).join("\n");
}

const routeNoisePattern =
  /(citywalk|chill|vlog|plog|附地图|地图|攻略|路线|笔记|分享|收藏|避雷|保姆级|打卡|小红书|抖音|微博|大家好|姐妹|宝子|宝宝|家人们|带你玩|带你玩儿|附近|周边|真的|非常|超|很|适合|可以|需要|提前|预约|门票|时间|小时|分钟|公里|地铁|公交|打车|自驾|导航|定位|评论区)/i;
const placeSuffixPattern =
  /(公园|故宫|博物院|博物馆|美术馆|艺术馆|餐厅|饭店|烤鸭店|小吃|咖啡馆|咖啡|胡同|广场|寺|塔|楼|亭|海|湖|山|街|巷|商场|酒店|景区|古镇|码头|书店|大学|机场|火车站|高铁站|车站|市场|剧院|书局|院|园|宫)$/;
const genericPlacePattern = /^(咖啡|小吃|餐厅|饭店|酒店|公园|商场|书店|河岸|附近|周边|地图|路线|机位)$/;

function normalizeSharedText(input: string) {
  let text = recognitionText(input);
  for (let index = 0; index < 2; index += 1) text = safeDecode(text);

  return text
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/#([^#\s]+)/g, " $1 ")
    .replace(/@[\u4e00-\u9fa5A-Za-z0-9_\-]+/g, " ")
    .replace(/大家好[^\n，。；;、]{0,36}(带你玩儿?|带你玩|推荐|分享)/g, " ")
    .replace(/[【】\[\]「」"'“”]/g, " ")
    .replace(/\d{1,2}[:：]\d{2}/g, " ")
    .replace(/\b(citywalk|chill|vlog|plog)\b/gi, " ")
    .replace(/(附地图|路线图|路线|攻略|打卡|收藏|分享|保姆级)/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanPlaceCandidate(value: string) {
  let item = value
    .replace(/^[\s\d.、:：-]+/, "")
    .replace(/^(第[一二三四五六七八九十\d]+站|上午|中午|下午|晚上|傍晚|清晨|然后|先去|再去|最后|从|到|去|逛|拍|吃|喝|玩|住|看)/, "")
    .replace(/^(推荐|地点|导航|定位|景点|美食|餐厅|酒店|拍照|机位)/, "")
    .trim();

  item = item.replace(/^(北京|上海|广州|深圳|杭州|成都|重庆|西安|南京|苏州|天津|武汉|长沙|青岛|厦门|大理|丽江|拉萨|新疆|云南|四川|浙江|江苏|广东|河北|河南|山东|山西|陕西|福建|贵州|广西|海南)/, "");
  item = item.replace(/(东边|西边|南边|北边|旁边|附近|周边|这条|这里|那里|还有|很多|露天|适合|拍照|机位|看日落|看展|吃饭|喝咖啡|散步|溜达|遛弯儿).*$/g, "");
  item = item.replace(/(附近|周边|拍照|机位|攻略|路线|打卡|推荐|吃饭|看日落|看展|附地图)$/g, "");

  return item.trim();
}

function pushCandidate(
  bucket: Map<string, { score: number; index: number }>,
  name: string,
  score: number,
  index: number,
) {
  const candidate = cleanPlaceCandidate(name);
  if (!candidate || candidate.length < 2 || candidate.length > 16) return;
  if (genericPlacePattern.test(candidate)) return;
  if (/^[A-Za-z0-9\s]+$/.test(candidate)) return;
  if (/^(北京|上海|广州|深圳|杭州|成都|重庆|西安|南京|苏州|上午|中午|下午|晚上|今天|明天|一日游|两日游|三日游)$/.test(candidate)) return;

  const dictionary = getPlaceDictionary();
  let nextScore = score;
  if (dictionary[candidate]) nextScore += 100;
  if (placeSuffixPattern.test(candidate)) nextScore += 45;
  if (routeNoisePattern.test(candidate)) nextScore -= 35;
  if (/[A-Za-z]/.test(candidate)) nextScore -= 30;
  if (candidate.length <= 3 && !dictionary[candidate]) nextScore -= 15;

  if (nextScore < 25) return;

  const existing = bucket.get(candidate);
  if (!existing || nextScore > existing.score) {
    bucket.set(candidate, { score: nextScore, index });
  }
}

function extractPlaceKeywords(input: string) {
  const text = normalizeSharedText(input);
  const bucket = new Map<string, { score: number; index: number }>();
  const dictionary = getPlaceDictionary();

  Object.keys(dictionary)
    .sort((a, b) => b.length - a.length)
    .forEach((name) => {
      const index = text.indexOf(name);
      if (index >= 0) pushCandidate(bucket, name, 140, index);
    });

  const suffixMatches = text.matchAll(/[\u4e00-\u9fa5A-Za-z0-9·（）()]{2,18}(?:公园|故宫|博物院|博物馆|美术馆|艺术馆|餐厅|饭店|烤鸭店|小吃|咖啡馆|咖啡|胡同|广场|寺|塔|楼|亭|海|湖|山|街|巷|商场|酒店|景区|古镇|码头|书店|大学|机场|火车站|高铁站|车站|市场|剧院|书局)/g);
  for (const match of suffixMatches) {
    pushCandidate(bucket, match[0], 65, match.index || 0);
  }

  text
    .split(/[，。；;、\n\r\t>|→➡\-]+/)
    .map((item) => item.trim())
    .forEach((item) => {
      pushCandidate(bucket, item, 30, text.indexOf(item));
    });

  return Array.from(bucket.entries())
    .sort((a, b) => a[1].index - b[1].index || b[1].score - a[1].score)
    .map(([name]) => name)
    .filter((name, index, list) => !list.some((other, otherIndex) => otherIndex < index && other.includes(name)))
    .slice(0, 8);
}

function searchPoi(AMap: any, keyword: string): Promise<Place | null> {
  const knownPlace = getPlaceDictionary()[keyword];
  if (knownPlace) {
    return Promise.resolve(knownPlace);
  }

  return new Promise((resolve) => {
    const search = new AMap.PlaceSearch({
      city: "全国",
      pageSize: 1,
      pageIndex: 1,
      extensions: "all",
    });

    search.search(keyword, (status: string, result: any) => {
      const poi = result?.poiList?.pois?.[0];
      const location = poi?.location;
      if (status === "complete" && location) {
        const { lon, lat } = normalizePoiLocation(location);
        if (Number.isFinite(lon) && Number.isFinite(lat)) {
          resolve({
            name: poi.name || keyword,
            lon,
            lat,
            address: poi.address || poi.district || "高德搜索结果",
            photoUrl: poiNativePhotoUrl(poi) || placePhotoMap[poi.name],
          });
          return;
        }
      }
      resolve(null);
    });
  });
}

async function resolvePlaces(AMap: any, keywords: string[]) {
  const results: Place[] = [];

  for (const keyword of keywords) {
    const place = await searchPoi(AMap, keyword);
    const fallback = getPlaceDictionary()[keyword];
    const resolvedPlace = place || fallback;

    if (resolvedPlace && !results.some((item) => item.name === resolvedPlace.name)) {
      results.push(resolvedPlace);
    }
  }

  return results;
}

function parseWalkingRoute(result: any, from: Place, to: Place, mode: TravelMode): RouteSegment {
  const route = result?.routes?.[0];
  const steps = (route?.steps || [])
    .map((step: any) => step.instruction || step.instruction?.toString())
    .filter(Boolean)
    .slice(0, 5);

  return {
    from,
    to,
    mode,
    distanceText: distanceText(route?.distance),
    durationText: durationText(route?.time),
    summary: `${from.name} → ${to.name}`,
    steps: steps.length ? steps : ["沿推荐路线前往下一站。"],
    navUrl: amapNavigationUrl(from, to, mode),
  };
}

function parseTransferRoute(result: any, from: Place, to: Place): RouteSegment {
  const plan = result?.plans?.[0];
  const segments = plan?.segments || [];
  const steps: string[] = [];

  for (const segment of segments) {
    const bus = segment?.transit;
    const walking = segment?.walking;
    if (walking?.distance) {
      steps.push(`步行 ${distanceText(walking.distance)}`);
    }
    if (bus?.lines?.[0]) {
      const line = bus.lines[0];
      const name = line.name || "公交/地铁";
      const departure = line.departure_stop?.name || "";
      const arrival = line.arrival_stop?.name || "";
      steps.push(`${name}${departure && arrival ? `：${departure} → ${arrival}` : ""}`);
    }
  }

  return {
    from,
    to,
    mode: "transfer",
    distanceText: distanceText(plan?.distance),
    durationText: durationText(plan?.time),
    summary: `${from.name} → ${to.name}`,
    steps: steps.length ? steps.slice(0, 6) : ["高德已返回公交/地铁方案，详情可继续接入面板展示。"],
    navUrl: amapNavigationUrl(from, to, "transfer"),
  };
}

function planOneSegment(AMap: any, from: Place, to: Place, mode: TravelMode): Promise<RouteSegment> {
  const origin = [from.lon, from.lat];
  const destination = [to.lon, to.lat];

  return new Promise((resolve) => {
    if (mode === "transfer") {
      const transfer = new AMap.Transfer({
        city: "北京市",
        policy: AMap.TransferPolicy?.LEAST_TIME,
      });

      transfer.search(origin, destination, (status: string, result: any) => {
        if (status === "complete" && result?.plans?.length) {
          resolve(parseTransferRoute(result, from, to));
          return;
        }

        const walking = new AMap.Walking();
        walking.search(origin, destination, (_walkingStatus: string, walkingResult: any) => {
          resolve(parseWalkingRoute(walkingResult, from, to, "walking"));
        });
      });
      return;
    }

    if (mode === "driving") {
      const driving = new AMap.Driving({ policy: AMap.DrivingPolicy?.LEAST_TIME });
      driving.search(origin, destination, (status: string, result: any) => {
        if (status === "complete") {
          resolve(parseWalkingRoute(result, from, to, "driving"));
          return;
        }
        resolve({
          from,
          to,
          mode,
          distanceText: "路线失败",
          durationText: "请重试",
          summary: `${from.name} → ${to.name}`,
          steps: ["高德驾车规划失败，请换成公交/步行模式。"],
          navUrl: amapNavigationUrl(from, to, mode),
        });
      });
      return;
    }

    const walking = new AMap.Walking();
    walking.search(origin, destination, (status: string, result: any) => {
      if (status === "complete") {
        resolve(parseWalkingRoute(result, from, to, "walking"));
        return;
      }
      resolve({
        from,
        to,
        mode,
        distanceText: "路线失败",
        durationText: "请重试",
        summary: `${from.name} → ${to.name}`,
        steps: ["高德步行规划失败，请调整地点关键词。"],
        navUrl: amapNavigationUrl(from, to, mode),
      });
    });
  });
}

async function planSegments(AMap: any, places: Place[], mode: TravelMode) {
  const segments: RouteSegment[] = [];

  for (let index = 0; index < places.length - 1; index += 1) {
    segments.push(await planOneSegment(AMap, places[index], places[index + 1], mode));
  }

  return segments;
}

export default function App() {
  const [screen, setScreen] = useState<Screen>("map");
  const [query, setQuery] = useState("北京中轴线");
  const [place, setPlace] = useState<Place>(initialPlace);
  const [savedCount, setSavedCount] = useState(0);
  const [isSearching, setIsSearching] = useState(false);
  const [searchNonce, setSearchNonce] = useState(0);
  const [copyText, setCopyText] = useState(demoText);
  const [travelMode, setTravelMode] = useState<TravelMode>("transfer");
  const [planningStatus, setPlanningStatus] = useState("粘贴分享文案后，可自动识别地点并规划路线。");
  const [isPlanning, setIsPlanning] = useState(false);
  const [mapNotice, setMapNotice] = useState("高德地图已接入，可搜索地点或定位当前位置。");
  const [tripPlan, setTripPlan] = useState<TripPlan | null>(null);
  const [learnedCount, setLearnedCount] = useState(0);
  const lastAutoClipboardRef = useRef("");

  useEffect(() => {
    const saved = window.localStorage.getItem("lukee.savedRoutes");
    if (saved) {
      setSavedCount(JSON.parse(saved).length);
    }
    setLearnedCount(learnedPlaceCount());
  }, []);

  function searchPlace() {
    if (!query.trim()) return;
    setIsSearching(true);
    setSearchNonce((value) => value + 1);
  }

  async function locateMe() {
    setMapNotice("正在请求当前位置...");

    try {
      const AMap = await loadAmap();
      const geolocation = new AMap.Geolocation({
        enableHighAccuracy: true,
        timeout: 10000,
        convert: true,
        showButton: false,
      });

      geolocation.getCurrentPosition((status: string, result: any) => {
        const position = result?.position;
        if (status === "complete" && position) {
          const lon = typeof position.getLng === "function" ? position.getLng() : position.lng;
          const lat = typeof position.getLat === "function" ? position.getLat() : position.lat;
          setPlace({
            name: "我的当前位置",
            lon: Number(lon),
            lat: Number(lat),
            address: result.formattedAddress || "高德定位结果",
          });
          setQuery("我的当前位置");
          setMapNotice("已定位到当前位置。");
          return;
        }

        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (browserPosition) => {
              setPlace({
                name: "我的当前位置",
                lat: browserPosition.coords.latitude,
                lon: browserPosition.coords.longitude,
                address: "浏览器定位结果",
              });
              setQuery("我的当前位置");
              setMapNotice("已通过浏览器定位到当前位置。");
            },
            () => {
              setMapNotice("定位失败：请允许浏览器位置权限，或检查系统定位服务。");
            },
            { enableHighAccuracy: true, timeout: 10000 },
          );
          return;
        }

        setMapNotice("定位失败：当前浏览器不支持定位。");
      });
    } catch (error: any) {
      setMapNotice(`定位失败：${error?.message || "请检查高德 Key / 定位权限"}`);
    }
  }

  function saveRoute() {
    const saved = JSON.parse(window.localStorage.getItem("lukee.savedRoutes") || "[]") as unknown[];
    const next = [
      {
        place: tripPlan?.places.map((item) => item.name).join(" - ") || place.name,
        date: new Date().toLocaleString("zh-CN"),
        plan: tripPlan,
      },
      ...saved,
    ].slice(0, 12);
    window.localStorage.setItem("lukee.savedRoutes", JSON.stringify(next));
    setSavedCount(next.length);
  }

  async function analyzeAndPlanRoute(textOverride?: string) {
    const text = (typeof textOverride === "string" ? textOverride : copyText).trim();
    if (!text) {
      setPlanningStatus("请先粘贴小红书/抖音分享文案、正文，或直接输入地点列表。");
      return;
    }

    setIsPlanning(true);

    let recognitionSource = text;
    let keywords = extractPlaceKeywords(recognitionSource);

    if (extractUrls(text).length) {
      setPlanningStatus("正在调用本地后端解析链接标题、描述和正文摘要...");
      const backendText = await parseLinksWithBackend(text);
      if (backendText) {
        recognitionSource = `${text}\n${backendText}`;
        keywords = extractPlaceKeywords(recognitionSource);
      }
    }

    if (hasOnlyUrls(text) && keywords.length < 2) {
      setPlanningStatus("这个链接里没有可读取的地点信息。请粘贴分享时附带的标题/正文，或在链接后补充地点，例如：故宫，南锣鼓巷，什刹海。");
      setIsPlanning(false);
      return;
    }

    if (keywords.length < 2) {
      setPlanningStatus("识别到的地点少于 2 个。可以写成：景山公园、故宫博物院、四季民福、什刹海。");
      setIsPlanning(false);
      return;
    }

    setPlanningStatus(`识别到 ${keywords.length} 个候选地点，正在调用高德搜索 POI...`);

    try {
      const AMap = await loadAmap();
      const resolvedPlaces = await resolvePlaces(AMap, keywords);
      setPlanningStatus("正在按景点关键词联网匹配真实图片...");
      const places = await enrichPlacesWithMatchedImages(resolvedPlaces);

      if (places.length < 2) {
        setPlanningStatus("高德只匹配到 1 个地点，请把地点名称写得更完整。");
        return;
      }

      const modes: TravelMode[] = ["transfer", "walking", "driving"];
      const options: Partial<Record<TravelMode, ModePlan>> = {};

      for (const mode of modes) {
        setPlanningStatus(`已匹配 ${places.length} 个地点，正在规划${preferenceLabel(mode)}方案...`);
        const modeSegments = await planSegments(AMap, places, mode);
        options[mode] = summarizeModePlan(mode, modeSegments);
      }

      const selectedOption = options[travelMode] || options.transfer || options.walking || options.driving;
      const segments = selectedOption?.segments || [];
      const nextPlan: TripPlan = {
        sourceText: recognitionSource,
        mode: travelMode,
        places,
        segments,
        options,
        createdAt: new Date().toLocaleString("zh-CN"),
      };

      setTripPlan(nextPlan);
      setPlace(places[0]);
      setPlanningStatus(`已生成 ${places.length} 个地点和 3 套交通偏好路线，可在路线页切换。`);
      setScreen("routeCard");
    } catch (error: any) {
      setPlanningStatus(`规划失败：${error?.message || "请检查高德 Key / 安全密钥 / 网络"}`);
    } finally {
      setIsPlanning(false);
    }
  }

  function handlePasteAndPlan(text: string) {
    setCopyText(text);
    const keywords = extractPlaceKeywords(text);

    if (keywords.length >= 2 || extractUrls(text).length) {
      window.setTimeout(() => analyzeAndPlanRoute(text), 160);
    } else {
      setPlanningStatus(hasOnlyUrls(text) ? "已粘贴链接，但暂未读到地点。请补充地点名称后点击生成。" : "已粘贴内容。若没有自动生成，请补充地点名称后点击生成。");
    }
  }

  async function handleOcrImage(file: File) {
    if (!file.type.startsWith("image/")) {
      setPlanningStatus("请上传小红书/抖音截图图片。");
      return;
    }

    setIsPlanning(true);
    setPlanningStatus("正在识别截图文字...");

    try {
      const imageBase64 = await readFileAsDataUrl(file);
      const response = await fetch(apiUrl("/api/ocr-image"), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ imageBase64, fileName: file.name }),
      });
      const data = await response.json();
      const text = normalizeOcrText(String(data.text || ""));

      if (!data.ok || !text) {
        setPlanningStatus(`截图 OCR 失败：${data.error || "没有识别到文字。可以截图更清晰一些，或手动粘贴标题/正文。"}`);
        return;
      }

      setPlanningStatus(`截图已识别 ${text.length} 个字符，正在生成路线...`);
      handlePasteAndPlan(text);
    } catch (error: any) {
      setPlanningStatus(`截图 OCR 失败：${error?.message || "请确认本地解析服务已启动"}`);
    } finally {
      setIsPlanning(false);
    }
  }

  async function learnPlaceAlias(alias: string, targetName: string) {
    const cleanAlias = alias.trim();
    const cleanTarget = targetName.trim();

    if (!cleanAlias || !cleanTarget) {
      setPlanningStatus("请填写原文里的叫法和正确地点名。");
      return;
    }

    setPlanningStatus("正在保存你的修正词条...");

    try {
      const dictionary = getPlaceDictionary();
      let targetPlace: Place | null =
        dictionary[cleanTarget] ||
        tripPlan?.places.find((item) => item.name === cleanTarget || item.name.includes(cleanTarget) || cleanTarget.includes(item.name)) ||
        null;

      if (!targetPlace) {
        const AMap = await loadAmap();
        targetPlace = await searchPoi(AMap, cleanTarget);
      }

      if (!targetPlace) {
        setPlanningStatus("没有找到这个正确地点，请把标准地点名写完整一些。");
        return;
      }

      const count = saveLearnedPlace(cleanAlias, targetPlace);
      setLearnedCount(count);
      setPlanningStatus(`已学习：“${cleanAlias}” → “${targetPlace.name}”。下次粘贴会优先识别这个叫法。`);
    } catch (error: any) {
      setPlanningStatus(`学习失败：${error?.message || "请稍后重试"}`);
    }
  }

  useEffect(() => {
    async function readClipboardAndPlan() {
      if (document.visibilityState !== "visible") return;
      if (!navigator.clipboard?.readText) return;

      try {
        const text = (await navigator.clipboard.readText()).trim();
        if (!text || text === lastAutoClipboardRef.current) return;
        if (!/(xiaohongshu|xhslink|douyin|iesdouyin|v\.douyin|http)/i.test(text)) return;

        lastAutoClipboardRef.current = text;
        setScreen("copy");
        setPlanningStatus("已从剪贴板发现新链接/文案，正在自动识别路线...");
        handlePasteAndPlan(text);
      } catch {
        // Clipboard reads require browser permission or a user gesture. Manual paste still works.
      }
    }

    const onFocus = () => {
      window.setTimeout(readClipboardAndPlan, 180);
    };
    const onVisibilityChange = () => {
      window.setTimeout(readClipboardAndPlan, 180);
    };

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.setTimeout(readClipboardAndPlan, 500);

    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  return (
    <main className="shell">
      <section className="hero">
        <div>
          <h1>路刻 Lukee</h1>
          <p>把地图、路线、美食和真实拍照机位整合到一个可使用的 App 里。现在可以从分享文案中识别地点，并调用高德地图规划公交、步行或驾车路线。</p>
        </div>
        <div className="glass card-pad source-note">
          当前版本已经接入高德 JS API：地点搜索、地图展示、文本识别路线、分段交通规划和本地保存都可以实际使用。
        </div>
      </section>

      <section className="workspace">
        <div className="phone">
          <div className="app">
            <ScreenFrame
              active={screen}
              query={query}
              setQuery={setQuery}
              place={place}
              setPlace={setPlace}
              isSearching={isSearching}
              setIsSearching={setIsSearching}
              searchNonce={searchNonce}
              copyText={copyText}
              setCopyText={setCopyText}
              travelMode={travelMode}
              setTravelMode={setTravelMode}
              planningStatus={planningStatus}
              isPlanning={isPlanning}
              tripPlan={tripPlan}
              learnedCount={learnedCount}
              mapNotice={mapNotice}
              savedCount={savedCount}
              go={setScreen}
              searchPlace={searchPlace}
              locateMe={locateMe}
              saveRoute={saveRoute}
              analyzeAndPlanRoute={analyzeAndPlanRoute}
              handlePasteAndPlan={handlePasteAndPlan}
              handleOcrImage={handleOcrImage}
              learnPlaceAlias={learnPlaceAlias}
            />
            <BottomNav active={screen} go={setScreen} />
          </div>
        </div>

        <aside className="side">
          <h2>现在不是样子货了</h2>
          <p>你可以把小红书/抖音分享文案、游记正文或地点列表粘到“复刻”页，App 会提取地点，调用高德搜索，并生成真实交通分段。</p>
          <div className="feature-grid">
            <div className="glass card-pad">
              <MapPinned />
              <h3>高德地图</h3>
              <p>真实加载地图、地点搜索和路线规划插件。</p>
            </div>
            <div className="glass card-pad">
              <Sparkles />
              <h3>内容识别</h3>
              <p>从正文中提取景点、餐厅、商圈、机位等地点。</p>
            </div>
            <div className="glass card-pad">
              <Utensils />
              <h3>交通路线</h3>
              <p>支持公交/地铁、步行、驾车三种方式。</p>
            </div>
          </div>
        </aside>
      </section>
    </main>
  );
}

function ScreenFrame(props: {
  active: Screen;
  query: string;
  setQuery: (value: string) => void;
  place: Place;
  setPlace: (place: Place) => void;
  isSearching: boolean;
  setIsSearching: (value: boolean) => void;
  searchNonce: number;
  copyText: string;
  setCopyText: (value: string) => void;
  travelMode: TravelMode;
  setTravelMode: (mode: TravelMode) => void;
  planningStatus: string;
  isPlanning: boolean;
  tripPlan: TripPlan | null;
  learnedCount: number;
  mapNotice: string;
  savedCount: number;
  go: (screen: Screen) => void;
  searchPlace: () => void;
  locateMe: () => void;
  saveRoute: () => void;
  analyzeAndPlanRoute: () => void;
  handlePasteAndPlan: (text: string) => void;
  handleOcrImage: (file: File) => void;
  learnPlaceAlias: (alias: string, targetName: string) => void;
}) {
  if (props.active === "route") return <RouteScreen go={props.go} saveRoute={props.saveRoute} place={props.place} tripPlan={props.tripPlan} travelMode={props.travelMode} setTravelMode={props.setTravelMode} />;
  if (props.active === "copy") return <CopyScreen {...props} />;
  if (props.active === "routeCard") {
    return (
      <RouteCardScreen
        go={props.go}
        saveRoute={props.saveRoute}
        tripPlan={props.tripPlan}
        planningStatus={props.planningStatus}
        travelMode={props.travelMode}
        setTravelMode={props.setTravelMode}
        copyText={props.copyText}
        setCopyText={props.setCopyText}
        handlePasteAndPlan={props.handlePasteAndPlan}
        analyzeAndPlanRoute={props.analyzeAndPlanRoute}
        isPlanning={props.isPlanning}
        learnedCount={props.learnedCount}
        learnPlaceAlias={props.learnPlaceAlias}
      />
    );
  }
  if (props.active === "food") return <FoodScreen tripPlan={props.tripPlan} place={props.place} />;
  if (props.active === "photo") return <PhotoScreen tripPlan={props.tripPlan} go={props.go} />;
  if (props.active === "me") return <MeScreen savedCount={props.savedCount} />;
  return <MapScreen {...props} />;
}

function Status() {
  return (
    <div className="status">
      <span>9:41</span>
      <span>5G 100%</span>
    </div>
  );
}

function TopBar({ title, left, right }: { title: string; left?: ReactNode; right?: ReactNode }) {
  return (
    <div className="topbar">
      {left ?? <Search />}
      <div className="brand">
        <span className="brand-dot" />
        {title}
      </div>
      {right ?? <User />}
    </div>
  );
}

function AmapView({
  place,
  setPlace,
  query,
  searchNonce,
  setIsSearching,
  tripPlan,
}: {
  place: Place;
  setPlace: (place: Place) => void;
  query: string;
  searchNonce: number;
  setIsSearching: (value: boolean) => void;
  tripPlan: TripPlan | null;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const routeOverlaysRef = useRef<any[]>([]);
  const searchRef = useRef<any>(null);
  const [status, setStatus] = useState("正在加载高德地图...");
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    let disposed = false;

    loadAmap()
      .then((AMap) => {
        if (disposed || !containerRef.current) return;

        const map = new AMap.Map(containerRef.current, {
          center: [place.lon, place.lat],
          zoom: 13,
          viewMode: "2D",
          resizeEnable: true,
          mapStyle: "amap://styles/grey",
        });

        const marker = new AMap.Marker({
          position: [place.lon, place.lat],
          title: place.name,
        });

        map.add(marker);
        map.addControl(new AMap.ToolBar({ position: { right: "10px", top: "70px" } }));
        map.addControl(new AMap.Scale());

        mapRef.current = map;
        markerRef.current = marker;
        searchRef.current = new AMap.PlaceSearch({
          city: "全国",
          pageSize: 5,
          pageIndex: 1,
        });
        setMapReady(true);
        setStatus("高德地图已就绪");
      })
      .catch((error) => {
        setStatus(`地图加载失败：${error?.message || "请检查 Key / 安全密钥"}`);
      });

    return () => {
      disposed = true;
      mapRef.current?.destroy?.();
      mapRef.current = null;
      markerRef.current = null;
      routeOverlaysRef.current = [];
      searchRef.current = null;
      setMapReady(false);
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current || !markerRef.current || tripPlan) return;
    const position = [place.lon, place.lat];
    markerRef.current.setPosition(position);
    markerRef.current.setTitle(place.name);
    mapRef.current.setCenter(position);
  }, [place, tripPlan]);

  useEffect(() => {
    if (!mapReady || !mapRef.current || !tripPlan) return;

    loadAmap().then((AMap) => {
      routeOverlaysRef.current.forEach((overlay) => mapRef.current.remove(overlay));
      routeOverlaysRef.current = [];

      const path = tripPlan.places.map((item) => [item.lon, item.lat]);
      const polyline = new AMap.Polyline({
        path,
        strokeColor: "#ffffff",
        strokeWeight: 5,
        strokeOpacity: 0.9,
        lineJoin: "round",
        showDir: true,
      });
      mapRef.current.add(polyline);
      routeOverlaysRef.current.push(polyline);

      tripPlan.places.forEach((item, index) => {
        const marker = new AMap.Marker({
          position: [item.lon, item.lat],
          title: item.name,
          label: {
            content: `${index + 1}. ${item.name}`,
            direction: "top",
          },
        });
        mapRef.current.add(marker);
        routeOverlaysRef.current.push(marker);
      });

      mapRef.current.setFitView(routeOverlaysRef.current, false, [80, 50, 140, 50]);
      setStatus(`已展示 ${tripPlan.places.length} 个路线地点`);
    });
  }, [tripPlan, mapReady]);

  useEffect(() => {
    if (!searchNonce || !searchRef.current) return;
    const keyword = query.trim();
    if (!keyword) {
      setIsSearching(false);
      return;
    }

    setStatus(`正在搜索：${keyword}`);
    searchRef.current.search(keyword, (searchStatus: string, result: any) => {
      setIsSearching(false);
      const poi = result?.poiList?.pois?.[0];
      const location = poi?.location;

      if (searchStatus === "complete" && location) {
        const { lon, lat } = normalizePoiLocation(location);
        setPlace({
          name: poi.name || keyword,
          lat,
          lon,
          address: poi.address || poi.district || "高德搜索结果",
        });
        setStatus(`已定位到：${poi.name || keyword}`);
      } else {
        setStatus("没有找到地点，可以换个关键词再试。");
      }
    });
  }, [searchNonce, query, setIsSearching, setPlace]);

  return (
    <>
      <div ref={containerRef} className="amap-view" />
      <div className="map-status">{status}</div>
    </>
  );
}

function MapScreen(props: {
  query: string;
  setQuery: (value: string) => void;
  place: Place;
  setPlace: (place: Place) => void;
  isSearching: boolean;
  setIsSearching: (value: boolean) => void;
  searchNonce: number;
  tripPlan: TripPlan | null;
  mapNotice: string;
  go: (screen: Screen) => void;
  searchPlace: () => void;
  locateMe: () => void;
}) {
  return (
    <section className="screen">
      <Status />
      <TopBar title="路刻" />

      <div className="map-card">
        <AmapView
          place={props.place}
          setPlace={props.setPlace}
          query={props.query}
          searchNonce={props.searchNonce}
          setIsSearching={props.setIsSearching}
          tripPlan={props.tripPlan}
        />
        <div className="map-overlay glass">
          <div className="row-title">{props.tripPlan ? "已生成路线" : props.place.name}</div>
          <div className="row-note">{props.tripPlan ? props.tripPlan.places.map((item) => item.name).join(" → ") : props.place.address || `经纬度 ${props.place.lat.toFixed(4)}, ${props.place.lon.toFixed(4)}`}</div>
        </div>
        <div className="map-tools">
          <input
            className="input"
            value={props.query}
            onChange={(event) => props.setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") props.searchPlace();
            }}
            placeholder="搜索城市、景点、餐厅"
          />
          <div className="grid-2">
            <button className="button" onClick={props.searchPlace}>
              <Search />
              {props.isSearching ? "搜索中" : "搜索地图"}
            </button>
            <button className="button soft" onClick={props.locateMe}>
              <LocateFixed />
              定位我
            </button>
          </div>
        </div>
      </div>

      <p className="subtitle">路线会同时考虑真实地图距离、开放时间、拍照光线和吃饭节奏。</p>
      <div className="glass card-pad map-notice">
        <div className="row-title">地图状态</div>
        <div className="row-note">{props.mapNotice}</div>
      </div>
      <div className="grid-2">
        <button className="glass card-pad" onClick={() => props.go("copy")} style={{ textAlign: "left" }}>
          <Link2 />
          <div className="row-title" style={{ marginTop: 10 }}>复刻内容路线</div>
          <div className="row-note">粘贴分享文案并规划交通路线</div>
        </button>
        <button className="glass card-pad" onClick={() => props.go("photo")} style={{ textAlign: "left" }}>
          <Camera />
          <div className="row-title" style={{ marginTop: 10 }}>找真实机位</div>
          <div className="row-note">动作参考来自抖音和小红书</div>
        </button>
      </div>
      <button className="button full" onClick={() => props.go(props.tripPlan ? "routeCard" : "copy")} style={{ marginTop: 12 }}>
        <Sparkles />
        {props.tripPlan ? "查看已规划路线" : "粘贴内容生成路线"}
      </button>
    </section>
  );
}

function RouteScreen({
  go,
  saveRoute,
  place,
  tripPlan,
  travelMode,
  setTravelMode,
}: {
  go: (screen: Screen) => void;
  saveRoute: () => void;
  place: Place;
  tripPlan: TripPlan | null;
  travelMode: TravelMode;
  setTravelMode: (mode: TravelMode) => void;
}) {
  return (
    <section className="screen">
      <Status />
      <TopBar title="路线" left={<button className="icon-btn" onClick={() => go("map")}><ArrowLeft /></button>} />
      <h2 className="title">{tripPlan ? "已规划交通路线" : `${place.name} 一日路线`}</h2>
      {tripPlan ? <PlanSummary tripPlan={tripPlan} travelMode={travelMode} setTravelMode={setTravelMode} go={go} /> : <FallbackRoute />}
      <button className="button full" onClick={saveRoute} style={{ marginTop: 12 }}>
        <BookmarkPlus />
        保存路线
      </button>
    </section>
  );
}

function FallbackRoute() {
  return (
    <>
      <div className="chips">
        <span className="chip active"><Heart />温馨轻松</span>
        <span className="chip">少换乘</span>
        <span className="chip">拍照优先</span>
      </div>
      <div className="metrics">
        <div className="metric"><b>5.8km</b><span>预计步行</span></div>
        <div className="metric"><b>4站</b><span>核心停留</span></div>
        <div className="metric"><b>17:20</b><span>日落机位</span></div>
      </div>
      <div className="glass card-pad list">
        {fallbackStops.map(([time, title, note]) => (
          <div className="route-row" key={time}>
            <Clock3 />
            <div>
              <div className="row-title">{title}</div>
              <div className="row-note">{note}</div>
            </div>
            <span className="badge">{time}</span>
          </div>
        ))}
      </div>
    </>
  );
}

function ModeSelector({ travelMode, setTravelMode }: { travelMode: TravelMode; setTravelMode: (mode: TravelMode) => void }) {
  const modes: Array<[TravelMode, string]> = [
    ["transfer", "公交地铁多"],
    ["walking", "步行多"],
    ["driving", "打车/自驾多"],
  ];

  return (
    <div className="mode-row">
      {modes.map(([mode, label]) => (
        <button key={mode} className={`mode-btn ${travelMode === mode ? "active" : ""}`} onClick={() => setTravelMode(mode)}>
          {label}
        </button>
      ))}
    </div>
  );
}

function CopyScreen(props: {
  go: (screen: Screen) => void;
  copyText: string;
  setCopyText: (value: string) => void;
  travelMode: TravelMode;
  setTravelMode: (mode: TravelMode) => void;
  planningStatus: string;
  isPlanning: boolean;
  analyzeAndPlanRoute: () => void;
  handlePasteAndPlan: (text: string) => void;
  handleOcrImage: (file: File) => void;
  learnedCount: number;
}) {
  const keywords = extractPlaceKeywords(props.copyText);

  return (
    <section className="screen">
      <Status />
      <TopBar title="复刻" left={<button className="icon-btn" onClick={() => props.go("map")}><ArrowLeft /></button>} />
      <h2 className="title">识别并规划路线</h2>
      <div className="glass card-pad">
        <textarea
          className="textarea glass"
          value={props.copyText}
          onChange={(event) => props.setCopyText(event.target.value)}
          onPaste={(event) => {
            const pastedText = event.clipboardData.getData("text");
            if (pastedText) {
              event.preventDefault();
              props.handlePasteAndPlan(pastedText);
            }
          }}
          placeholder="直接粘贴文案或链接。更推荐粘贴带标题/正文的分享文案，例如：北京初夏 citywalk，景山公园、故宫博物院、四季民福、什刹海。"
        />
        <ModeSelector travelMode={props.travelMode} setTravelMode={props.setTravelMode} />
        <button className="button full" onClick={() => props.analyzeAndPlanRoute()} disabled={props.isPlanning} style={{ marginTop: 10 }}>
          <WandSparkles />
          {props.isPlanning ? "正在生成路线..." : "直接生成路线界面"}
        </button>
      </div>
      <div className="glass card-pad" style={{ marginTop: 10 }}>
        <div className="row-title">候选地点</div>
        <div className="row-note">{props.planningStatus}</div>
        <div className="row-note">已启用 App 内置全国景点词条库：{placeLexicon.length} 个标准地点，{lexiconAliasCount} 个全称/简称/俗称；已学习 {props.learnedCount} 个你的修正词条。</div>
        <div className="tag-row">
          {keywords.length ? keywords.map((item) => <span className="badge" key={item}>{item}</span>) : <span className="badge">等待识别</span>}
        </div>
      </div>
      <div className="glass card-pad" style={{ marginTop: 10 }}>
        <div className="row-title">截图 OCR</div>
        <div className="row-note">上传小红书/抖音截图，识别图片里的标题、正文和地点名。</div>
        <label className="button full file-button" style={{ marginTop: 10 }}>
          <Camera />
          选择截图并识别
          <input
            type="file"
            accept="image/*"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) props.handleOcrImage(file);
              event.currentTarget.value = "";
            }}
          />
        </label>
      </div>
      <div className="glass card-pad" style={{ marginTop: 10 }}>
        <div className="row-title">提高识别准确率</div>
        <div className="row-note">最稳格式：链接 + 标题/正文 + 地点名。纯链接如果没有可解码标题，浏览器无法读取平台正文；你可以在链接后补一句“故宫，南锣鼓巷，什刹海”。</div>
      </div>
    </section>
  );
}

function PlanSummary({
  tripPlan,
  travelMode,
  setTravelMode,
  go,
}: {
  tripPlan: TripPlan;
  travelMode: TravelMode;
  setTravelMode: (mode: TravelMode) => void;
  go?: (screen: Screen) => void;
}) {
  const modes: TravelMode[] = ["transfer", "walking", "driving"];
  const activePlan = tripPlan.options[travelMode] || tripPlan.options.transfer || tripPlan.options.walking || tripPlan.options.driving;
  const activeSegments = activePlan?.segments || tripPlan.segments;

  return (
    <div className="itinerary-sheet">
      <div className="sheet-grabber" />
      <div className="trip-tabs">
        <span>总览</span>
        <b>DAY 1</b>
        <span>待计划</span>
        <span>＋</span>
      </div>
      <div className="trip-title-row">
        <div>
          <strong>DAY 1</strong>
          <span>中轴线经典穿越</span>
        </div>
        <small>{tripPlan.places.length} 个地点</small>
      </div>
      <div className="route-options">
        {modes.map((mode) => {
          const option = tripPlan.options[mode];
          return (
            <button key={mode} className={`route-option ${travelMode === mode ? "active" : ""}`} onClick={() => setTravelMode(mode)}>
              <b>{preferenceLabel(mode)}</b>
              <span>{option?.durationText || "待计算"}</span>
              <small>{option?.distanceText || modeLabel(mode)}</small>
            </button>
          );
        })}
      </div>

      <div className="timeline-list">
        {tripPlan.places.map((place, index) => {
          const nextSegment = activeSegments[index];
          const shot = photoPlan(place, index);
          return (
            <div className="timeline-block" key={`${place.name}-${index}`}>
              <div className="place-row">
                <img
                  className="place-thumb"
                  src={placePhotoUrl(place, index)}
                  alt={place.name}
                  referrerPolicy="no-referrer"
                  onError={(event) => {
                    event.currentTarget.src = placePlaceholderImage(place.name);
                  }}
                />
                <div className="place-main">
                  <div className="place-type">{placeCategory(place.name)}</div>
                  <h3>{index + 1}.{place.name}</h3>
                  <div className="place-note-card">
                    <button aria-label="编辑">✎</button>
                    <b>{scheduleWindow(index)}</b>
                    <p>{placeNote(place, index)}</p>
                  </div>
                  <div className="same-shot-card">
                    <div className="same-shot-title">
                      <Camera />
                      <b>拍出同款</b>
                    </div>
                    <div className="shot-visuals">
                      {shotVisualAssets(place, index).map((asset) => (
                        <figure key={asset.label}>
                          <img
                            src={asset.img}
                            alt={`${place.name}${asset.label}`}
                            referrerPolicy="no-referrer"
                            onError={(event) => {
                              event.currentTarget.src = asset.label === "动作" ? posePhotoPool[0] : placePlaceholderImage(place.name);
                            }}
                          />
                          <figcaption><b>{asset.label}</b><span>{asset.text}</span></figcaption>
                        </figure>
                      ))}
                    </div>
                    <div className="shot-grid">
                      <span><strong>机位</strong>{shot.spot}</span>
                      <span><strong>光线</strong>{shot.light}</span>
                      <span><strong>动作</strong>{shot.pose}</span>
                    </div>
                    <p>{shot.frame}</p>
                    <div className="shot-actions">
                      <button type="button" onClick={() => go?.("photo")}>查看动作卡</button>
                      <a target="_blank" href={`https://www.xiaohongshu.com/search_result?keyword=${encodeURIComponent(`${place.name} 拍照 机位 姿势`)}`}>小红书同款</a>
                      <a target="_blank" href={`https://www.douyin.com/search/${encodeURIComponent(`${place.name} 拍照 机位 动作`)}`}>抖音视频</a>
                    </div>
                  </div>
                </div>
              </div>
              {nextSegment ? (
                <a className="transfer-row" href={nextSegment.navUrl} target="_blank">
                  <span>{modeLabel(nextSegment.mode)}</span>
                  <b>{nextSegment.distanceText} · {nextSegment.durationText}</b>
                  <small>打开高德导航 ›</small>
                </a>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function RouteCardScreen({
  go,
  saveRoute,
  tripPlan,
  planningStatus,
  travelMode,
  setTravelMode,
  copyText,
  setCopyText,
  handlePasteAndPlan,
  analyzeAndPlanRoute,
  isPlanning,
  learnedCount,
  learnPlaceAlias,
}: {
  go: (screen: Screen) => void;
  saveRoute: () => void;
  tripPlan: TripPlan | null;
  planningStatus: string;
  travelMode: TravelMode;
  setTravelMode: (mode: TravelMode) => void;
  copyText: string;
  setCopyText: (value: string) => void;
  handlePasteAndPlan: (text: string) => void;
  analyzeAndPlanRoute: () => void;
  isPlanning: boolean;
  learnedCount: number;
  learnPlaceAlias: (alias: string, targetName: string) => void;
}) {
  const [aliasDraft, setAliasDraft] = useState("");
  const [targetDraft, setTargetDraft] = useState(tripPlan?.places[0]?.name || "");

  return (
    <section className="screen route-screen">
      <Status />
      <TopBar title="路线跳转" left={<button className="icon-btn" onClick={() => go("copy")}><ArrowLeft /></button>} />
      <div className="route-paste glass">
        <textarea
          value={copyText}
          onChange={(event) => setCopyText(event.target.value)}
          onPaste={(event) => {
            const pastedText = event.clipboardData.getData("text");
            if (pastedText) {
              event.preventDefault();
              handlePasteAndPlan(pastedText);
            }
          }}
          placeholder="粘贴小红书/抖音链接或路线文案，会立即重新识别"
        />
        <button className="button soft" onClick={() => analyzeAndPlanRoute()} disabled={isPlanning}>
          {isPlanning ? "识别中" : "更新路线"}
        </button>
      </div>
      {tripPlan ? (
        <>
          <div className="route-mini-map glass">
            <MapPinned />
            <div>
              <b>已生成路线图</b>
              <span>{tripPlan.places.map((item) => item.name).join(" → ")}</span>
            </div>
            <button className="icon-btn" onClick={() => go("map")} aria-label="查看地图">
              <MapIcon />
            </button>
          </div>
          <div className="route-learning glass">
            <div>
              <b>识别错了就教它</b>
              <span>已学习 {learnedCount} 个本地词条，下次粘贴自动生效。</span>
            </div>
            <input value={aliasDraft} onChange={(event) => setAliasDraft(event.target.value)} placeholder="原文叫法，如：小蛮腰" />
            <input list="route-place-targets" value={targetDraft} onChange={(event) => setTargetDraft(event.target.value)} placeholder="正确地点，如：广州塔" />
            <datalist id="route-place-targets">
              {tripPlan.places.map((item) => <option key={item.name} value={item.name} />)}
            </datalist>
            <button className="button soft" onClick={() => learnPlaceAlias(aliasDraft, targetDraft)}>保存修正</button>
          </div>
          <PlanSummary tripPlan={tripPlan} travelMode={travelMode} setTravelMode={setTravelMode} go={go} />
          <div className="floating-route-actions">
            <button className="button soft" onClick={saveRoute}><BookmarkPlus />保存</button>
            <button className="button soft" onClick={() => go("photo")}><Camera />拍照</button>
            <button className="button" onClick={() => go("map")}><MapIcon />地图</button>
          </div>
        </>
      ) : (
        <div className="glass card-pad">
          <div className="row-title">还没有路线</div>
          <div className="row-note">{planningStatus}</div>
          <button className="button full" onClick={() => go("copy")} style={{ marginTop: 10 }}>去粘贴内容</button>
        </div>
      )}
      <div className="glass card-pad" style={{ marginTop: 10 }}>
        <div className="source-line">
          <div><div className="row-title">景山万春亭故宫机位</div><div className="row-note">打开抖音搜索真实视频参考</div></div>
          <a className="button soft" target="_blank" href={douyinSpotUrl}>抖音</a>
        </div>
        <div className="source-line">
          <div><div className="row-title">什刹海日落拍照动作</div><div className="row-note">打开小红书搜索真实图文/视频参考</div></div>
          <a className="button soft" target="_blank" href={xhsPoseUrl}>小红书</a>
        </div>
      </div>
    </section>
  );
}

type FoodRouteItem = {
  name: string;
  anchor: string;
  note: string;
  img: string;
  detourText: string;
  mealType: string;
  impact: string;
  nextHint: string;
  routeFit: string;
  amapUrl: string;
  dianpingUrl: string;
  score?: number;
};

function estimateWalkMinutes(distance?: number) {
  if (!distance || Number.isNaN(Number(distance))) return 8;
  return Math.max(2, Math.round(Number(distance) / 75));
}

function mealTypeFromPoi(poi: any) {
  const source = `${poi?.name || ""} ${poi?.type || ""}`;
  if (/咖啡|茶|甜品|面包|饮品/.test(source)) return "咖啡/甜品";
  if (/小吃|快餐|粉|面|包子|烧饼/.test(source)) return "轻食小吃";
  if (/火锅|烤肉|烤鸭|川菜|湘菜|粤菜|中餐|餐厅|饭店/.test(source)) return "正餐";
  return "顺路补给";
}

function foodImpact(distance?: number) {
  const minutes = estimateWalkMinutes(distance);
  if (minutes <= 5) return "基本不影响下一站";
  if (minutes <= 10) return "轻微绕路，适合顺路吃";
  return "会拉长节奏，建议作为正餐停留";
}

function poiPhotoUrl(poi: any, mealType: string) {
  const photo = poi?.photos?.[0]?.url || poi?.photos?.[0]?.url_big || poi?.photos?.[0]?.url_small;
  return photo || foodPhotoByType[mealType] || foodPhotoByType["顺路补给"];
}

function foodSearchKeywords(index: number) {
  if (index === 0) return ["咖啡", "小吃", "餐厅"];
  if (index === 1) return ["餐厅", "小吃", "咖啡"];
  return ["小吃", "咖啡", "餐厅"];
}

function routeFitLabel(anchor: Place, nextPlace?: Place) {
  return nextPlace ? `${anchor.name} → ${nextPlace.name} 之间补给` : `${anchor.name} 之后放松停留`;
}

function midpointPlace(from: Place, to?: Place): Place {
  if (!to) return from;
  return {
    name: `${from.name}到${to.name}中途`,
    lat: (from.lat + to.lat) / 2,
    lon: (from.lon + to.lon) / 2,
    address: routeFitLabel(from, to),
  };
}

function routeFallbackFoods(anchors: Place[]) {
  const templates = [
    { suffix: "附近正餐", mealType: "正餐", keyword: "餐厅" },
    { suffix: "沿途小吃", mealType: "轻食小吃", keyword: "小吃" },
    { suffix: "顺路咖啡", mealType: "咖啡/甜品", keyword: "咖啡" },
  ];

  return anchors.slice(0, 4).map((anchor, index) => {
    const nextPlace = anchors[index + 1];
    const template = templates[index % templates.length];
    const name = `${anchor.name}${template.suffix}`;
    return {
      name,
      anchor: anchor.name,
      note: `按当前路线动态生成 · 建议打开高德/大众点评确认营业与评分`,
      img: foodPhotoByType[template.mealType] || fallbackFoodPhoto,
      detourText: index === 0 ? "绕路约 5 分钟" : "绕路约 6-9 分钟",
      mealType: template.mealType,
      impact: index === 0 ? "适合安排为第一段补给" : "不影响下一站节奏",
      nextHint: nextPlace ? `下一站：${nextPlace.name}` : "路线末段，可放松停留",
      routeFit: routeFitLabel(anchor, nextPlace),
      amapUrl: `https://uri.amap.com/search?keyword=${encodeURIComponent(`${anchor.name} ${template.keyword}`)}`,
      dianpingUrl: `https://www.dianping.com/search/keyword/2/0_${encodeURIComponent(`${anchor.name} ${template.keyword}`)}`,
    };
  });
}

function FoodScreen({ tripPlan, place }: { tripPlan: TripPlan | null; place: Place }) {
  const [nearbyFoods, setNearbyFoods] = useState<FoodRouteItem[]>([]);
  const [foodStatus, setFoodStatus] = useState("正在根据路线搜索附近餐厅...");

  useEffect(() => {
    let disposed = false;

    async function loadRestaurants() {
      try {
        const AMap = await loadAmap();
        const anchors = tripPlan?.places?.length ? tripPlan.places : [place];
        const collected: FoodRouteItem[] = [];

        for (const anchor of anchors.slice(0, 4)) {
          const anchorIndex = anchors.findIndex((item) => item.name === anchor.name);
          const nextPlace = anchors[anchorIndex + 1];
          const searchCenter = midpointPlace(anchor, nextPlace);
          const search = new AMap.PlaceSearch({
            type: "餐饮服务",
            city: "全国",
            pageSize: 3,
            pageIndex: 1,
            extensions: "all",
          });

          const pois = (
            await Promise.all(
              foodSearchKeywords(anchorIndex).map(
                (keyword) =>
                  new Promise<any[]>((resolve) => {
                    search.searchNearBy(keyword, [searchCenter.lon, searchCenter.lat], 1600, (status: string, result: any) => {
                      resolve(status === "complete" ? result?.poiList?.pois || [] : []);
                    });
                  }),
              ),
            )
          ).flat();

          for (const poi of pois) {
            if (!collected.some((item) => item.name === poi.name)) {
              const detourMinutes = estimateWalkMinutes(poi.distance);
              const mealType = mealTypeFromPoi(poi);
              const poiLocation = normalizePoiLocation(poi.location);
              const poiPlace: Place = {
                name: poi.name,
                lat: Number.isFinite(poiLocation.lat) ? poiLocation.lat : anchor.lat,
                lon: Number.isFinite(poiLocation.lon) ? poiLocation.lon : anchor.lon,
                address: poi.address || poi.district || "高德餐饮 POI",
              };
              collected.push({
                name: poi.name,
                anchor: anchor.name,
                note: `${poi.distance ? `${poi.distance}m` : "约 1km 内"} · ${poi.type || "餐饮服务"}`,
                detourText: `绕路约 ${detourMinutes} 分钟`,
                mealType,
                impact: foodImpact(poi.distance),
                nextHint: nextPlace ? `下一站：${nextPlace.name}` : "路线末段，可放松停留",
                routeFit: routeFitLabel(anchor, nextPlace),
                amapUrl: amapNavigationUrl(anchor, poiPlace, "walking"),
                dianpingUrl: `https://www.dianping.com/search/keyword/2/0_${encodeURIComponent(poi.name)}`,
                img: poiPhotoUrl(poi, mealType),
                score: anchorIndex * 1000 + detourMinutes,
              });
            }
          }
        }

        if (!disposed) {
          const sortedFoods = collected.sort((a, b) => (a.score || 0) - (b.score || 0)).slice(0, 8);
          setNearbyFoods(sortedFoods.length ? sortedFoods : routeFallbackFoods(anchors));
          setFoodStatus(sortedFoods.length ? "已按当前路线段实时推荐附近餐饮。" : "高德周边暂未返回餐厅，已按当前路线生成动态补给建议。");
        }
      } catch (error: any) {
        if (!disposed) {
          setFoodStatus(`餐厅 POI 加载失败：${error?.message || "请检查高德 Key / 网络"}`);
        }
      }
    }

    loadRestaurants();

    return () => {
      disposed = true;
    };
  }, [tripPlan, place]);

  const routeAnchors = tripPlan?.places?.length ? tripPlan.places : [place];
  const items: FoodRouteItem[] = nearbyFoods.length ? nearbyFoods : routeFallbackFoods(routeAnchors);

  return (
    <section className="screen">
      <Status />
      <TopBar title="美食" right={<SlidersHorizontal />} />
      <h2 className="title">路线上的实时补给</h2>
      <p className="subtitle">{foodStatus}</p>
      <div className="list">
        {items.map((item) => (
          <div className="glass card-pad food-card" key={item.name}>
            <img
              className="food-img"
              src={item.img}
              alt={item.name}
              referrerPolicy="no-referrer"
              onError={(event) => {
                event.currentTarget.src = foodPhotoByType[item.mealType] || fallbackFoodPhoto;
              }}
            />
            <div>
              <div className="card-head">
                <h3>{item.name}</h3>
                <span className="badge"><Star />{item.mealType}</span>
              </div>
              <div className="food-route-fit">{item.routeFit}</div>
              <div className="food-route-meta">
                <span>{item.anchor} 附近</span>
                <span>{item.detourText}</span>
              </div>
              <div className="row-note">{item.note}</div>
              <div className="food-impact">
                <b>{item.impact}</b>
                <span>{item.nextHint}</span>
              </div>
              <div className="food-actions">
                <a target="_blank" href={item.amapUrl}>高德导航</a>
                <a target="_blank" href={item.dianpingUrl}>大众点评</a>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function photoAdvice(place: Place, index: number) {
  const plan = photoPlan(place, index);
  return `${plan.spot}；${plan.light}；动作参考：${plan.pose}。`;
}

function PhotoScreen({ tripPlan, go }: { tripPlan: TripPlan | null; go: (screen: Screen) => void }) {
  const routePlaces = tripPlan?.places?.length ? tripPlan.places : [knownPlaces["景山公园"], knownPlaces["故宫"], knownPlaces["什刹海"]].filter(Boolean);

  return (
    <section className="screen">
      <Status />
      <TopBar title="拍照" left={<button className="icon-btn" onClick={() => go("routeCard")}><ArrowLeft /></button>} right={<Heart />} />
      <h2 className="title">跟随路线的拍照建议</h2>
      <p className="subtitle">根据当前路线自动生成机位和动作示例，参考入口来自抖音和小红书搜索。</p>
      <div className="list">
        {routePlaces.map((place, index) => (
          <div className="glass card-pad" key={`${place.name}-${index}`}>
            <div className="image-card">
              <img
                src={placePhotoUrl(place, index)}
                alt={place.name}
                referrerPolicy="no-referrer"
                onError={(event) => {
                  event.currentTarget.src = placePlaceholderImage(place.name);
                }}
              />
              <span className="image-label"><b>{index + 1}. {place.name}</b><span>{scheduleWindow(index)} · {placeCategory(place.name)}</span></span>
            </div>
            <div className="photo-visual-strip">
              {shotVisualAssets(place, index).map((asset) => (
                <figure key={asset.label}>
                  <img
                    src={asset.img}
                    alt={`${place.name}${asset.label}`}
                    referrerPolicy="no-referrer"
                    onError={(event) => {
                      event.currentTarget.src = asset.label === "动作" ? posePhotoPool[0] : placePlaceholderImage(place.name);
                    }}
                  />
                  <figcaption>{asset.label}</figcaption>
                </figure>
              ))}
            </div>
            <div className="photo-breakdown">
              <div><b>机位</b><span>{photoPlan(place, index).spot}</span></div>
              <div><b>光线</b><span>{photoPlan(place, index).light}</span></div>
              <div><b>动作</b><span>{photoPlan(place, index).pose}</span></div>
            </div>
            <div className="source-line">
              <div>
                <div className="row-title">同款构图</div>
                <div className="row-note">{photoAdvice(place, index)}</div>
              </div>
              <Camera />
            </div>
            <div className="grid-2" style={{ marginTop: 10 }}>
              <a className="button soft" target="_blank" href={`https://www.douyin.com/search/${encodeURIComponent(`${place.name} 拍照 机位 姿势`)}`}><PlayCircle />抖音</a>
              <a className="button soft" target="_blank" href={`https://www.xiaohongshu.com/search_result?keyword=${encodeURIComponent(`${place.name} 拍照 机位 姿势`)}`}><Camera />小红书</a>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function MeScreen({ savedCount }: { savedCount: number }) {
  return (
    <section className="screen">
      <Status />
      <TopBar title="我的" right={<Settings />} />
      <h2 className="title">温馨但高效</h2>
      <div className="glass card-pad">
        <div className="card-head">
          <h3>旅行偏好</h3>
          <span className="badge">已保存 {savedCount}</span>
        </div>
        <div className="source-line">
          <div><div className="row-title">默认交通</div><div className="row-note">地铁 + 步行，少打车</div></div>
          <ChevronRight />
        </div>
        <div className="source-line">
          <div><div className="row-title">避开人群</div><div className="row-note">热门点默认提示排队风险</div></div>
          <ToggleRight />
        </div>
      </div>
    </section>
  );
}

function BottomNav({ active, go }: { active: Screen; go: (screen: Screen) => void }) {
  const items: Array<[Screen, string, ReactNode]> = [
    ["map", "地图", <MapIcon key="map" />],
    ["copy", "复刻", <Link2 key="copy" />],
    ["food", "美食", <Utensils key="food" />],
    ["photo", "拍照", <Camera key="photo" />],
    ["me", "我的", <UserRound key="me" />],
  ];

  return (
    <nav className="bottom-nav">
      {items.map(([id, label, icon]) => (
        <button key={id} className={`nav-btn ${active === id ? "active" : ""}`} onClick={() => go(id)}>
          {icon}
          {label}
        </button>
      ))}
    </nav>
  );
}
