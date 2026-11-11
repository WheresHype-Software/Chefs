import assert from "node:assert/strict";
import { test } from "node:test";
import { instagramHandle, instagramUrl } from "@/lib/instagram";

test("the ways chefs actually type it", () => {
  assert.equal(instagramHandle("@amodadabea_"), "amodadabea_");
  assert.equal(instagramHandle("ivopacheco17"), "ivopacheco17");
  assert.equal(instagramHandle("@chef.victormunhoz"), "chef.victormunhoz");
  assert.equal(instagramHandle(" claucook "), "claucook");
});

test("a profile link, with or without tracking, gives the username", () => {
  assert.equal(instagramHandle("https://www.instagram.com/chef_fukumura?srtk=MTlkcmxveXF2dHE2Zg=="), "chef_fukumura");
  assert.equal(instagramHandle("instagram.com/hajacroquetes/"), "hajacroquetes");
  assert.equal(instagramHandle("http://m.instagram.com/a.b#x"), "a.b");
});

test("names and other links are not usernames", () => {
  assert.equal(instagramHandle("Ana Batista-vamosahorta"), null);
  assert.equal(instagramHandle("https://www.instagram.com/p/Cx123/"), null);
  assert.equal(instagramHandle("https://facebook.com/x"), null);
  assert.equal(instagramHandle(""), null);
  assert.equal(instagramHandle(undefined), null);
});

test("the link", () => {
  assert.equal(instagramUrl("amodadabea_"), "https://www.instagram.com/amodadabea_/");
});
