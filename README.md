# BUGS
- On first render/load, there will be overlap of the grid boxes. By changing the size of the screen, the overlap will disappear, but the boxes will not appropriately resize to take up the entire container. A page reload at this point will cause the boxes to stay properly aligned without overlap.

- There is still an issue where the draggability is not moving other items on the grid while an item is being dragged. This is preventing me allowing sortability and also I can't start resizing until I get this part working.

- My thoughts: The 'layout' being diffed is the layout that is being actually rendered (which is from the synchronizeLayoutWithChildren) that changes the positions up to prevent overlap

- From the Showcase, clicking the generate new layout button is not triggering the grid to update. (Issue passing down the layout from the top)

# Notes
- There area a bunch of .bk files in here right now. They are from failed attempts or just old attempts at getting things working.
- The version of mithril used in the initial development is unknown. I believe it is v1.1.2, but for some reason the grid wasn't rendering from v1.1.6 loaded via unpkg cdn.

# Building with Rollup (not working) 
$ rollup main.js --file bundle.js --format iife

or to use the config file:
$ rollup -c