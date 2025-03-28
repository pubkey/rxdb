import { invoke } from "@tauri-apps/api/core";
import sqlite3 from "@tauri-apps/plugin-sql";
import {
  getRxStorageSQLiteTrial,
  getSQLiteBasicsTauri,
} from "rxdb/plugins/storage-sqlite";
import { wrappedValidateAjvStorage } from "rxdb/plugins/validate-ajv";

import { getDatabase } from "./database";

const heroesList = document.querySelector("#heroes-list");

async function run() {
  if (!heroesList) {
    console.error("Couldn't find #heroes-list");
    return;
  }

  const dbSuffix = await invoke("get_db_suffix", {});

  const storage = getRxStorageSQLiteTrial({
    sqliteBasics: getSQLiteBasicsTauri(sqlite3),
  });
  console.log("GET DATABASE");
  const db = await getDatabase(
    "heroesdb" + dbSuffix,
    wrappedValidateAjvStorage({ storage: storage }),
  );
  console.log("GET DATABASE DONE");

  /**
   * map the result of the find-query to the heroes-list in the dom
   */
  db.heroes
    .find()
    .sort({
      name: "asc",
    })
    .$.subscribe(function (heroes) {
      if (!heroes) {
        heroesList.innerHTML = "Loading..";
        return;
      }
      console.log("observable fired");
      console.dir(heroes);

      heroesList.innerHTML = heroes
        .map((hero) => {
          return (
            "<li>" +
            '<div class="color-box" style="background:' +
            hero.color +
            '"></div>' +
            '<div class="name" name="' +
            hero.name +
            '">' +
            hero.name +
            "</div>" +
            "</li>"
          );
        })
        .reduce((pre, cur) => (pre += cur), "");
    });

  window.addHero = async function () {
    const name = document.querySelector('input[name="name"]').value;
    const color = document.querySelector('input[name="color"]').value;
    const obj = {
      name: name,
      color: color,
    };
    console.log("inserting hero:");
    console.dir(obj);
    await db.heroes.insert(obj);
    console.log("inserting hero DONE");
  };
}
run();
