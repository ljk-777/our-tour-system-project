import shaheBg from '../assets/bupt-shahe-campus-map.jpg';
import xituchengBg from '../assets/bupt-xitucheng-campus-map.png';

export const CAMPUS_CONFIGS = {
  shahe: {
    id: 'shahe',
    title: '北邮沙河校园导航',
    subtitle: '自定义校园路网 + Dijkstra',
    mapSize: { width: 1280, height: 914 },
    bgImage: shaheBg,
  },
  xitucheng: {
    id: 'xitucheng',
    title: '北邮西土城校园导航',
    subtitle: '自定义校园路网 + Dijkstra',
    mapSize: { width: 1500, height: 2100 },
    bgImage: xituchengBg,
  },
};
