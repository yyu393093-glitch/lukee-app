"use client";

import { useEffect, useMemo, useState } from "react";
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
  Navigation,
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
  Youtube,
} from "lucide-react";

type Screen = "map" | "route" | "copy" | "routeCard" | "food" | "photo" | "me";

type Place = {
  name: string;
  lat: number;
  lon: number;
};

const initialPlace: Place = {
  name: "北京中轴线",
  lat: 39.9163,
  lon: 116.3972,
};

const routeStops = [
  ["09:30", "景山公园", "先登高看故宫屋脊，光线更稳。"],
  ["11:20", "故宫北门", "沿中轴线慢走，保留拍照时间。"],
  ["13:00", "四季民福", "烤鸭午餐，建议提前排队取号。"],
  ["16:40", "什刹海", "湖边日落和行走动作参考。"],
];

const foodItems = [
  {
    name: "四季民福烤鸭店",
    note: "路线偏离约 8 分钟，人均约 150，适合正餐。",
    img: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/44/Peking_Duck%2C_2014_%2802%29.jpg/320px-Peking_Duck%2C_2014_%2802%29.jpg",
  },
  {
    name: "姚记炒肝",
    note: "老北京小吃，适合把午餐做轻一点。",
    img: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2b/Baozi_and_soup.jpg/320px-Baozi_and_soup.jpg",
  },
  {
    name: "护国寺小吃",
    note: "靠近什刹海，适合路线末段补给。",
    img: "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d6/Douzhir.jpg/320px-Douzhir.jpg",
  },
];

function osmEmbedUrl(place: Place) {
  const delta = 0.018;
  const left = place.lon - delta;
  const right = place.lon + delta;
  const top = place.lat + delta;
  const bottom = place.lat - delta;

  return `https://www.openstreetmap.org/export/embed.html?bbox=${left}%2C${bottom}%2C${right}%2C${top}&layer=mapnik&marker=${place.lat}%2C${place.lon}`;
}

export default function Home() {
  const [screen, setScreen] = useState<Screen>("map");
  const [query, setQuery] = useState("北京中轴线");
  const [place, setPlace] = useState<Place>(initialPlace);
  const [savedCount, setSavedCount] = useState(0);
  const [isSearching, setIsSearching] = useState(false);
  const [copyText, setCopyText] = useState("");

  const mapUrl = useMemo(() => osmEmbedUrl(place), [place]);

  useEffect(() => {
    const saved = window.localStorage.getItem("lukee.savedRoutes");
    if (saved) {
      setSavedCount(JSON.parse(saved).length);
    }
  }, []);

  async function searchPlace() {
    const keyword = query.trim();
    if (!keyword) return;

    setIsSearching(true);
    try {
      const params = new URLSearchParams({
        format: "json",
        limit: "1",
        q: keyword,
      });
      const response = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`);
      const data = (await response.json()) as Array<{ display_name: string; lat: string; lon: string }>;

      if (data[0]) {
        setPlace({
          name: data[0].display_name.split(",")[0] || keyword,
          lat: Number(data[0].lat),
          lon: Number(data[0].lon),
        });
      }
    } finally {
      setIsSearching(false);
    }
  }

  function locateMe() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((position) => {
      setPlace({
        name: "我的当前位置",
        lat: position.coords.latitude,
        lon: position.coords.longitude,
      });
      setQuery("我的当前位置");
    });
  }

  function saveRoute() {
    const saved = JSON.parse(window.localStorage.getItem("lukee.savedRoutes") || "[]") as unknown[];
    const next = [
      {
        place: place.name,
        date: new Date().toLocaleString("zh-CN"),
        stops: routeStops,
      },
      ...saved,
    ].slice(0, 12);
    window.localStorage.setItem("lukee.savedRoutes", JSON.stringify(next));
    setSavedCount(next.length);
  }

  return (
    <main className="shell">
      <section className="hero">
        <div>
          <h1>路刻 Lukee</h1>
          <p>把地图、路线、美食和真实拍照机位整合到一个可使用的 App 原型里。现在这版已经可以搜索真实地点、更新地图、保存路线，并通过社媒搜索入口查看真实视频参考。</p>
        </div>
        <div className="glass card-pad source-note">
          当前版本：Next.js 可运行前端。下一步接入高德地图 Key 后，就能做国内更稳定的路线规划、POI 和周边美食。
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
              mapUrl={mapUrl}
              isSearching={isSearching}
              copyText={copyText}
              setCopyText={setCopyText}
              savedCount={savedCount}
              go={setScreen}
              searchPlace={searchPlace}
              locateMe={locateMe}
              saveRoute={saveRoute}
            />
            <BottomNav active={screen} go={setScreen} />
          </div>
        </div>

        <aside className="side">
          <h2>现在可以继续真实化</h2>
          <p>我已经先把项目搭成真实 App 的形态。你可以在本地运行它，然后我们继续一步一步接入高德地图、数据库、账号和 AI 路线生成。</p>
          <div className="feature-grid">
            <div className="glass card-pad">
              <MapPinned />
              <h3>真实地图</h3>
              <p>当前使用 OpenStreetMap 搜索和嵌入地图，后续可换成高德地图。</p>
            </div>
            <div className="glass card-pad">
              <Utensils />
              <h3>美食推荐</h3>
              <p>先保留推荐卡片，下一步接地图 POI 返回真实周边餐厅。</p>
            </div>
            <div className="glass card-pad">
              <Camera />
              <h3>真实机位</h3>
              <p>用开放图片和社媒搜索入口，避免直接复制平台内容。</p>
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
  mapUrl: string;
  isSearching: boolean;
  copyText: string;
  setCopyText: (value: string) => void;
  savedCount: number;
  go: (screen: Screen) => void;
  searchPlace: () => void;
  locateMe: () => void;
  saveRoute: () => void;
}) {
  if (props.active === "route") return <RouteScreen go={props.go} saveRoute={props.saveRoute} place={props.place} />;
  if (props.active === "copy") return <CopyScreen {...props} />;
  if (props.active === "routeCard") return <RouteCardScreen go={props.go} />;
  if (props.active === "food") return <FoodScreen />;
  if (props.active === "photo") return <PhotoScreen />;
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

function TopBar({
  title,
  left,
  right,
}: {
  title: string;
  left?: React.ReactNode;
  right?: React.ReactNode;
}) {
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

function MapScreen(props: {
  query: string;
  setQuery: (value: string) => void;
  place: Place;
  mapUrl: string;
  isSearching: boolean;
  go: (screen: Screen) => void;
  searchPlace: () => void;
  locateMe: () => void;
}) {
  return (
    <section className="screen">
      <Status />
      <TopBar title="路刻" />

      <div className="map-card">
        <iframe className="map-frame" src={props.mapUrl} title="真实地图" />
        <div className="map-overlay glass">
          <div className="row-title">{props.place.name}</div>
          <div className="row-note">经纬度 {props.place.lat.toFixed(4)}, {props.place.lon.toFixed(4)}</div>
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
      <div className="grid-2">
        <button className="glass card-pad" onClick={() => props.go("copy")} style={{ textAlign: "left" }}>
          <Link2 />
          <div className="row-title" style={{ marginTop: 10 }}>复刻内容路线</div>
          <div className="row-note">粘贴小红书、抖音、B站链接</div>
        </button>
        <button className="glass card-pad" onClick={() => props.go("photo")} style={{ textAlign: "left" }}>
          <Camera />
          <div className="row-title" style={{ marginTop: 10 }}>找真实机位</div>
          <div className="row-note">动作参考和视频入口</div>
        </button>
      </div>
      <button className="button full" onClick={() => props.go("route")} style={{ marginTop: 12 }}>
        <Sparkles />
        生成今天路线
      </button>
    </section>
  );
}

function RouteScreen({ go, saveRoute, place }: { go: (screen: Screen) => void; saveRoute: () => void; place: Place }) {
  return (
    <section className="screen">
      <Status />
      <TopBar title="路线" left={<button className="icon-btn" onClick={() => go("map")}><ArrowLeft /></button>} />
      <h2 className="title">{place.name} 一日路线</h2>
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
        {routeStops.map(([time, title, note]) => (
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
      <button className="button full" onClick={saveRoute} style={{ marginTop: 12 }}>
        <BookmarkPlus />
        保存路线
      </button>
    </section>
  );
}

function CopyScreen(props: { go: (screen: Screen) => void; copyText: string; setCopyText: (value: string) => void }) {
  return (
    <section className="screen">
      <Status />
      <TopBar title="复刻" left={<button className="icon-btn" onClick={() => props.go("map")}><ArrowLeft /></button>} />
      <h2 className="title">粘贴链接或笔记</h2>
      <div className="glass card-pad">
        <textarea
          className="textarea glass"
          value={props.copyText}
          onChange={(event) => props.setCopyText(event.target.value)}
          placeholder="粘贴小红书、抖音、B站链接，或直接粘贴笔记文字。第一版会先保留内容，后续接 AI 自动提取地点。"
        />
        <button className="button full" onClick={() => props.go("routeCard")} style={{ marginTop: 10 }}>
          <WandSparkles />
          解析并生成路线卡
        </button>
      </div>
      <div className="grid-2" style={{ marginTop: 10 }}>
        <div className="glass card-pad"><b>地点抽取</b><div className="row-note">从文字中识别景点、餐厅、机位。</div></div>
        <div className="glass card-pad"><b>顺路重排</b><div className="row-note">按距离、时间和偏好重组。</div></div>
      </div>
    </section>
  );
}

function RouteCardScreen({ go }: { go: (screen: Screen) => void }) {
  return (
    <section className="screen">
      <Status />
      <TopBar title="路线卡" left={<button className="icon-btn" onClick={() => go("copy")}><ArrowLeft /></button>} />
      <h2 className="title">内容复刻结果</h2>
      <div className="glass card-pad">
        <div className="card-head">
          <h3>景山到什刹海</h3>
          <span className="badge">约 6 小时</span>
        </div>
        <p className="subtitle">把社媒内容里的景点、动作参考和吃饭点重排成一条更好走的路线。</p>
        <button className="button full" onClick={() => go("route")}>
          <BookmarkPlus />
          保存优化路线
        </button>
      </div>
      <div className="glass card-pad" style={{ marginTop: 10 }}>
        <div className="source-line">
          <div><div className="row-title">景山万春亭故宫机位</div><div className="row-note">打开 B站搜索真实视频参考</div></div>
          <a className="button soft" target="_blank" href="https://search.bilibili.com/all?keyword=%E6%99%AF%E5%B1%B1%20%E4%B8%87%E6%98%A5%E4%BA%AD%20%E6%95%85%E5%AE%AB%20%E6%8B%8D%E7%85%A7%20%E6%9C%BA%E4%BD%8D">打开</a>
        </div>
        <div className="source-line">
          <div><div className="row-title">什刹海日落拍照动作</div><div className="row-note">打开小红书搜索真实视频参考</div></div>
          <a className="button soft" target="_blank" href="https://www.xiaohongshu.com/search_result?keyword=%E4%BB%80%E5%88%B9%E6%B5%B7%20%E6%97%A5%E8%90%BD%20%E6%8B%8D%E7%85%A7%20%E5%A7%BF%E5%8A%BF">打开</a>
        </div>
      </div>
    </section>
  );
}

function FoodScreen() {
  return (
    <section className="screen">
      <Status />
      <TopBar title="美食" right={<SlidersHorizontal />} />
      <h2 className="title">顺路吃点好的</h2>
      <p className="subtitle">第一版展示推荐结构，后续接地图 POI 后会按当前位置和路线实时刷新。</p>
      <div className="list">
        {foodItems.map((item) => (
          <div className="glass card-pad food-card" key={item.name}>
            <img className="food-img" src={item.img} alt={item.name} />
            <div>
              <div className="card-head">
                <h3>{item.name}</h3>
                <span className="badge"><Star />4.7</span>
              </div>
              <div className="row-note">{item.note}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function PhotoScreen() {
  return (
    <section className="screen">
      <Status />
      <TopBar title="拍照" right={<Heart />} />
      <h2 className="title">真实机位与动作参考</h2>
      <div className="image-card">
        <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/e/ef/The_Forbidden_City_-_View_from_Coal_Hill.jpg/640px-The_Forbidden_City_-_View_from_Coal_Hill.jpg" alt="景山俯瞰故宫" />
        <span className="image-label"><b>景山 / 万春亭</b><span>俯拍故宫屋脊，适合长焦和侧身回头。</span></span>
      </div>
      <div className="glass card-pad" style={{ marginTop: 10 }}>
        <div className="source-line">
          <div><div className="row-title">动作参考</div><div className="row-note">走路、扶栏、回头、看远处。</div></div>
          <Camera />
        </div>
        <div className="grid-2" style={{ marginTop: 10 }}>
          <a className="button soft" target="_blank" href="https://search.bilibili.com/all?keyword=%E6%99%AF%E5%B1%B1%20%E4%B8%87%E6%98%A5%E4%BA%AD%20%E6%95%85%E5%AE%AB%20%E6%8B%8D%E7%85%A7%20%E6%9C%BA%E4%BD%8D"><PlayCircle />B站参考</a>
          <a className="button soft" target="_blank" href="https://www.youtube.com/results?search_query=Jingshan+Park+Forbidden+City+photography+spot"><Youtube />视频搜索</a>
        </div>
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
  const items: Array<[Screen, string, React.ReactNode]> = [
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
