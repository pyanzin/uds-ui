using System.Web.Mvc;

namespace UdsSite.Controllers {
    public class HomeController : Controller {
        public ActionResult Index(string id) {
            return View();
        }
    }
}