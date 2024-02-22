type GraphItem = {
  name: string;
  value: number;
};

type Graph = {
  graphItems: GraphItem[];
  id: string;
  color: string;
};

type Dashboard = {
  graphs: Graph[];
  title: string;
  columns?: number;
  height?: number;
};

type ShieldIndicator = {
  name: string;
  code: string;
  value: number | string;
};
