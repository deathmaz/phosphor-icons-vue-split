// @vitest-environment happy-dom
import { mount } from "@vue/test-utils";
import { h } from "vue";
import { describe, expect, it } from "vitest";
import PhHeartRegular from "../src/icons/PhHeartRegular.vue";
import PhHeartDuotone from "../src/icons/PhHeartDuotone.vue";

describe("generated Vue components", () => {
  describe("default rendering", () => {
    it("renders an svg element", () => {
      const wrapper = mount(PhHeartRegular);
      expect(wrapper.element.tagName).toBe("svg");
    });

    it("has correct viewBox", () => {
      const wrapper = mount(PhHeartRegular);
      expect(wrapper.attributes("viewBox")).toBe("0 0 256 256");
    });

    it("has default size of 1em", () => {
      const wrapper = mount(PhHeartRegular);
      expect(wrapper.attributes("width")).toBe("1em");
      expect(wrapper.attributes("height")).toBe("1em");
    });

    it("has default fill of currentColor", () => {
      const wrapper = mount(PhHeartRegular);
      expect(wrapper.attributes("fill")).toBe("currentColor");
    });

    it("does not have transform by default", () => {
      const wrapper = mount(PhHeartRegular);
      expect(wrapper.attributes("transform")).toBeUndefined();
    });

    it("contains path elements with SVG data", () => {
      const wrapper = mount(PhHeartRegular);
      const paths = wrapper.findAll("path");
      expect(paths.length).toBeGreaterThan(0);
      expect(paths[0].attributes("d")).toBeTruthy();
    });
  });

  describe("props", () => {
    it("applies custom size as number", () => {
      const wrapper = mount(PhHeartRegular, { props: { size: 32 } });
      expect(wrapper.attributes("width")).toBe("32");
      expect(wrapper.attributes("height")).toBe("32");
    });

    it("applies custom size as string", () => {
      const wrapper = mount(PhHeartRegular, { props: { size: "2rem" } });
      expect(wrapper.attributes("width")).toBe("2rem");
      expect(wrapper.attributes("height")).toBe("2rem");
    });

    it("applies custom color", () => {
      const wrapper = mount(PhHeartRegular, { props: { color: "hotpink" } });
      expect(wrapper.attributes("fill")).toBe("hotpink");
    });

    it("applies mirrored transform when true", () => {
      const wrapper = mount(PhHeartRegular, { props: { mirrored: true } });
      expect(wrapper.attributes("transform")).toBe("scale(-1, 1)");
    });

    it("does not apply transform when mirrored is false", () => {
      const wrapper = mount(PhHeartRegular, { props: { mirrored: false } });
      expect(wrapper.attributes("transform")).toBeUndefined();
    });
  });

  describe("provide/inject context", () => {
    it("uses injected size", () => {
      const wrapper = mount(PhHeartRegular, {
        global: { provide: { size: "48px" } },
      });
      expect(wrapper.attributes("width")).toBe("48px");
      expect(wrapper.attributes("height")).toBe("48px");
    });

    it("uses injected color", () => {
      const wrapper = mount(PhHeartRegular, {
        global: { provide: { color: "red" } },
      });
      expect(wrapper.attributes("fill")).toBe("red");
    });

    it("uses injected mirrored", () => {
      const wrapper = mount(PhHeartRegular, {
        global: { provide: { mirrored: true } },
      });
      expect(wrapper.attributes("transform")).toBe("scale(-1, 1)");
    });

    it("props override injected values", () => {
      const wrapper = mount(PhHeartRegular, {
        props: { size: 16, color: "blue" },
        global: { provide: { size: "48px", color: "red" } },
      });
      expect(wrapper.attributes("width")).toBe("16");
      expect(wrapper.attributes("fill")).toBe("blue");
    });
  });

  describe("slots", () => {
    it("renders slot content inside svg", () => {
      const wrapper = mount(PhHeartRegular, {
        slots: {
          default: h("title", "Heart icon"),
        },
      });
      const title = wrapper.find("title");
      expect(title.exists()).toBe(true);
      expect(title.text()).toBe("Heart icon");
    });
  });

  describe("attrs passthrough", () => {
    it("passes additional attributes to svg", () => {
      const wrapper = mount(PhHeartRegular, {
        attrs: { "data-testid": "heart-icon", class: "icon" },
      });
      expect(wrapper.attributes("data-testid")).toBe("heart-icon");
      expect(wrapper.attributes("class")).toBe("icon");
    });
  });

  describe("duotone components", () => {
    it("renders multiple path elements including opacity layer", () => {
      const wrapper = mount(PhHeartDuotone);
      const paths = wrapper.findAll("path");
      expect(paths.length).toBeGreaterThanOrEqual(2);

      const opacityPath = paths.find(
        (p) => p.attributes("opacity") === "0.2"
      );
      expect(opacityPath).toBeDefined();
    });
  });
});
