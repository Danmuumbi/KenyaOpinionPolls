import {
  getCounties,
  getConstituenciesByCounty,
  getWardsByConstituency,
} from "osm-kenya-boundaries";

const counties = getCounties();

const county = counties[0];

console.log("COUNTY:");
console.dir(county, { depth: 10 });

const constituencies = getConstituenciesByCounty(county.name);

console.log("\nCONSTITUENCIES:");
console.dir(constituencies, { depth: 10 });

if (constituencies.length > 0) {
  console.log("\nFIRST CONSTITUENCY:");
  console.dir(constituencies[0], { depth: 10 });

  console.log("\nCONSTITUENCY KEYS:");
  console.log(Object.keys(constituencies[0]));

  const firstConstituency = constituencies[0];

  const wards = getWardsByConstituency(firstConstituency.name);

  console.log("\nWARDS:");
  console.dir(wards, { depth: 10 });

  if (wards.length > 0) {
    console.log("\nFIRST WARD:");
    console.dir(wards[0], { depth: 10 });

    console.log("\nWARD KEYS:");
    console.log(Object.keys(wards[0]));
  }
}