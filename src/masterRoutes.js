import { Icon } from "@chakra-ui/react";
import {
  MdBarChart,
  MdPeople,
  MdBusiness,
  MdSettings,
  MdDashboard,
  MdHome,
  MdHistory,
} from "react-icons/md";

// Master Dashboard Views
import MasterDashboard from "views/master/default";
import MasterAccessLogs from "views/master/access-logs";
import MasterUsers from "views/master/users";
import MasterSettings from "views/master/settings";

const masterRoutes = [
  {
    name: "Home",
    layout: "/admin",
    path: "/default",
    icon: <Icon as={MdHome} width="20px" height="20px" color="inherit" />,
    component: null,
    isExternal: true,
  },
  {
    name: "Master Dashboard",
    layout: "/master",
    path: "/default",
    icon: <Icon as={MdDashboard} width="20px" height="20px" color="inherit" />,
    component: <MasterDashboard />,
  },
  {
    name: "Access Logs",
    layout: "/master",
    path: "/access-logs",
    icon: <Icon as={MdHistory} width="20px" height="20px" color="inherit" />,
    component: <MasterAccessLogs />,
    secondary: true,
  },
  {
    name: "All Users",
    layout: "/master",
    path: "/users",
    icon: <Icon as={MdPeople} width="20px" height="20px" color="inherit" />,
    component: <MasterUsers />,
    secondary: true,
  },
  {
    name: "System Settings",
    layout: "/master",
    path: "/settings",
    icon: <Icon as={MdSettings} width="20px" height="20px" color="inherit" />,
    component: <MasterSettings />,
    secondary: true,
  },
];

export default masterRoutes;
