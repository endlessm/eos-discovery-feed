SUBDIRS = po

# Our Autoconf macros are kept in the m4/ directory
ACLOCAL_AMFLAGS = -I m4

# Resources
resource_files = $(shell $(GLIB_COMPILE_RESOURCES) --sourcedir=$(srcdir)/src --generate-dependencies $(srcdir)/src/com.endlessm.DiscoveryFeed.src.gresource.xml)
app_resource_files = $(shell $(GLIB_COMPILE_RESOURCES) --sourcedir=$(srcdir)/data --generate-dependencies $(srcdir)/data/com.endlessm.DiscoveryFeed.data.gresource.xml)

resourcedir = $(pkgdatadir)
resource_DATA = data/com.endlessm.DiscoveryFeed.data.gresource \
		src/com.endlessm.DiscoveryFeed.src.gresource \
		$(NULL)

servicedir = $(datadir)/dbus-1/services
service_DATA = $(service_in_files:.service.in=.service)
service_in_files = \
	data/com.endlessm.DiscoveryFeed.service.in \
        $(NULL)

gsettings_SCHEMAS = data/com.endlessm.DiscoveryFeed.gschema.xml

%.gschema.xml: %.gschema.xml.in Makefile
	$(AM_V_GEN) sed -e 's|@GETTEXT_PACKAGE[@]|$(GETTEXT_PACKAGE)|g' \
	$< > $@ || rm $@

@GSETTINGS_RULES@

# Tests
javascript_tests = \
	tests/js/testDiscoveryFeed.js \
	tests/js/testModelOrdering.js \
	$(NULL)

# All JS files (used for linting)
all_js_files = \
	$(javascript_tests) \
	$(resource_files) \
	$(NULL)

# Set EXTRA_DIST and CLEANFILES initially
EXTRA_DIST = \
	$(resource_files) \
	$(javascript_tests) \
	$(service_in_files) \
	$(app_resource_files) \
	src/com.endlessm.DiscoveryFeed.in \
	src/com.endlessm.DiscoveryFeed.src.gresource.xml \
	data/com.endlessm.DiscoveryFeed.data.gresource.xml \
	data/com.endlessm.DiscoveryFeed.gschema.xml.in \
	$(NULL)

data/com.endlessm.DiscoveryFeed.service: $(srcdir)/data/com.endlessm.DiscoveryFeed.service.in
	$(AM_V_GEN) mkdir -p data
	$(AM_V_GEN) sed -e "s|\@bindir\@|$(bindir)|" $< > $@

data/com.endlessm.DiscoveryFeed.data.gresource: $(srcdir)/data/com.endlessm.DiscoveryFeed.data.gresource.xml $(app_resource_files)
	$(AM_V_GEN) mkdir -p data
	$(AM_V_GEN) $(GLIB_COMPILE_RESOURCES) --target=$@ --sourcedir=$(srcdir)/data $<

src/com.endlessm.DiscoveryFeed.src.gresource: $(srcdir)/src/com.endlessm.DiscoveryFeed.src.gresource.xml $(resource_files)
	$(AM_V_GEN) mkdir -p src
	$(AM_V_GEN) $(GLIB_COMPILE_RESOURCES) --target=$@ --sourcedir=$(srcdir)/src $<

src/com.endlessm.DiscoveryFeed: $(srcdir)/src/com.endlessm.DiscoveryFeed.in $(manager_resources)
	$(AM_V_GEN) mkdir -p src
	$(AM_V_GEN) sed \
		-e "s|[@]GJS@|$(GJS)|g" \
		-e "s|[@]PACKAGE_VERSION@|$(PACKAGE_VERSION)|g" \
		-e "s|[@]prefix@|$(prefix)|g" \
		-e "s|[@]libdir@|$(libdir)|g" \
		-e "s|[@]pkgdatadir@|$(pkgdatadir)|g" \
		$< > $@
	chmod +x $@
	echo $(app_resource_files)

# Scripts to install
bin_SCRIPTS = src/com.endlessm.DiscoveryFeed

# Distclean
CLEANFILES = \
	$(resource_DATA) \
	$(service_DATA) \
	src/com.endlessm.DiscoveryFeed \
	$(gsettings_SCHEMAS) \
	$(NULL)

#  Run tests when running 'make check'
TESTS = \
	$(javascript_tests) \
	run_coverage.coverage \
	run_eslint.eslint \
	$(NULL)
LOG_COMPILER = gtester
AM_LOG_FLAGS = -k --verbose

TEST_EXTENSIONS = .js .coverage .eslint

JS_LOG_DRIVER = env AM_TAP_AWK='$(AWK)' $(SHELL) $(top_srcdir)/tap-driver.sh
JS_LOG_DRIVER_FLAGS = --comments
JS_LOG_COMPILER = jasmine
AM_JS_LOG_FLAGS = --tap --no-config @JASMINE_REPORT_ARGUMENT@

# Use locally built versions of S modules, and
# libraries. We clobber GJS_PATH and include the js directory and the
# $(top_srcdir) for including test helper files.
# (May need to change to AM_TESTS_ENVIRONMENT in a later version of Automake)
TESTS_ENVIRONMENT = \
	export GJS_PATH="$(top_srcdir):$(top_srcdir)/src"; \
	export GI_TYPELIB_PATH="$(top_builddir)$${GI_TYPELIB_PATH:+:$$GI_TYPELIB_PATH}"; \
	export LD_LIBRARY_PATH="$(top_builddir)/.libs$${LD_LIBRARY_PATH:+:$$LD_LIBRARY_PATH}"; \
	export G_TEST_SRCDIR="$(abs_srcdir)/tests"; \
	export G_TEST_BUILDDIR="$(abs_builddir)/tests"; \
	export LC_ALL=C; \
	$(NULL)

# # # COVERAGE # # #

# Don't specify the resource:/// URIs here, because the tests load modules from
# the local directory, not from the GResource
EOS_JS_COVERAGE_FILES := $(patsubst $(srcdir)/%,%,$(wildcard $(srcdir)/src/*.js))

@EOS_COVERAGE_RULES@

AM_JS_LOG_FLAGS += @EOS_JS_COVERAGE_LOG_FLAGS@

# # # LINTING # # #
EOS_ESLINT_FILES := $(all_js_files)

@EOS_ESLINT_RULES@

