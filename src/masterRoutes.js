import { Icon } from "@chakra-ui/react";
import {
  MdBarChart,
  MdPeople,
  MdBusiness,
  MdSettings,
  MdDashboard,
} from "react-icons/md";

// Master Dashboard Views
import MasterDashboard from "views/master/default";
import MasterOrganizations from "views/master/organizations";
import MasterUsers from "views/master/users";
import MasterSettings from "views/master/settings";

const masterRoutes = [
  {
    name: "Master Dashboard",
    layout: "/master",
    path: "/default",
    icon: <Icon as={MdDashboard} width="20px" height="20px" color="inherit" />,
    component: MasterDashboard,
  },
  {
    name: "Organizations",
    layout: "/master",
    path: "/organizations",
    icon: <Icon as={MdBusiness} width="20px" height="20px" color="inherit" />,
    component: MasterOrganizations,
    secondary: true,
  },
  {
    name: "All Users",
    layout: "/master",
    path: "/users",
    icon: <Icon as={MdPeople} width="20px" height="20px" color="inherit" />,
    component: MasterUsers,
    secondary: true,
  },
  {
    name: "System Settings",
    layout: "/master",
    path: "/settings",
    icon: <Icon as={MdSettings} width="20px" height="20px" color="inherit" />,
    component: MasterSettings,
    secondary: true,
  },
];

export default masterRoutes;
